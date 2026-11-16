// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 传输层测试：`api-client` 是前端唯一与后端对话的出口。
 *
 * 这里测的不是「fetch 会不会被调用」，而是几条真实踩过的坑：
 * - 无请求体的 POST 不能带 `Content-Type`，否则后端判 415（登出接口踩过）；
 * - 上传必须让浏览器自己写 boundary，手写 `Content-Type` 会让服务端解析失败；
 * - `AbortError` 不能被归一到 `NETWORK_ERROR`，否则「用户主动取消」会弹成「网络故障」；
 * - 5xx 响应体缺包络时不能把 `undefined` 当错误码塞给 UI。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  apiUpload,
} from '../../src/lib/api-client'

const OK = { data: { ok: true } }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}

/** 取最后一次 fetch 的入参与地址，避免每个用例重复写类型断言。 */
function lastRequest() {
  const call = vi.mocked(globalThis.fetch).mock.calls.at(-1)
  if (!call) throw new Error('fetch 未被调用')
  return { url: call[0] as URL, init: (call[1] ?? {}) as RequestInit }
}

describe('apiGet', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('拼接 /api 前缀、携带同源凭据与 Accept 头', async () => {
    mockFetch(jsonResponse(OK))
    const result = await apiGet<{ ok: boolean }>('posts')

    const { url, init } = lastRequest()
    expect(url.pathname).toBe('/api/posts')
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('same-origin')
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')
    expect(result).toEqual(OK)
  })

  it('路径已带前导斜杠时不会拼出双斜杠', async () => {
    mockFetch(jsonResponse(OK))
    await apiGet('/posts/1')
    expect(lastRequest().url.pathname).toBe('/api/posts/1')
  })

  it('params 只序列化有值的项，undefined 与空串被跳过', async () => {
    mockFetch(jsonResponse(OK))
    await apiGet('feed', { params: { tab: 'latest', cursor: undefined, topic: '', page: 2 } })

    const { url } = lastRequest()
    expect(url.searchParams.get('tab')).toBe('latest')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.has('cursor')).toBe(false)
    expect(url.searchParams.has('topic')).toBe(false)
  })

  it('非 2xx 时按服务端包络抛 ApiError：code / message / status / requestId 全部接管', async () => {
    mockFetch(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: '标题不能为空',
            requestId: 'req-42',
            details: [{ field: 'title', constraint: 'required' }],
          },
        },
        422,
      ),
    )

    const error = await apiGet('posts').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.code).toBe('VALIDATION_FAILED')
    expect(apiError.message).toBe('标题不能为空')
    expect(apiError.status).toBe(422)
    expect(apiError.requestId).toBe('req-42')
    expect(apiError.details?.[0]?.field).toBe('title')
  })

  it('非 2xx 但响应体缺包络时回退到 INTERNAL_ERROR，不把 undefined 透给界面', async () => {
    mockFetch(jsonResponse({ unexpected: true }, 500))

    const error = (await apiGet('posts').catch((e: unknown) => e)) as ApiError
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.message).toBe('请求失败，请稍后重试')
    expect(error.requestId).toBe('none')
  })

  it('响应不是 JSON 时报 INVALID_RESPONSE，而不是抛原始语法错误', async () => {
    mockFetch(new Response('<html>502</html>', { status: 502 }))

    const error = (await apiGet('posts').catch((e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('INVALID_RESPONSE')
    expect(error.status).toBe(502)
  })

  it('fetch 自身失败（断网）归一为 NETWORK_ERROR，status 为 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    const error = (await apiGet('posts').catch((e: unknown) => e)) as ApiError
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
  })

  it('用户主动取消时原样抛 AbortError，不被误报成网络故障', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abort)

    const error = await apiGet('posts').catch((e: unknown) => e)
    expect(error).toBe(abort)
    expect(error).not.toBeInstanceOf(ApiError)
    expect((error as DOMException).name).toBe('AbortError')
  })

  it('file:// 离线预览下不发请求，直接报 OFFLINE_PREVIEW', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const descriptor = Object.getOwnPropertyDescriptor(window, 'location')
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { protocol: 'file:', origin: 'null' },
    })

    try {
      const error = (await apiGet('posts').catch((e: unknown) => e)) as ApiError
      expect(error).toBeInstanceOf(ApiError)
      expect(error.code).toBe('OFFLINE_PREVIEW')
      expect(spy).not.toHaveBeenCalled()
    } finally {
      if (descriptor) Object.defineProperty(window, 'location', descriptor)
    }
  })
})

describe('写入类请求的头部契约', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // 每个用例会发多次请求：Response 的 body 只能读一次，必须每次新建。
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ data: null }, 201))
  })

  it('无请求体的 POST 不带 Content-Type（否则登出等接口会被判 415）', async () => {
    await apiPost('auth/logout')
    const { init } = lastRequest()
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('有请求体的 POST 序列化 JSON 并显式声明 Content-Type', async () => {
    await apiPost('posts', { title: '你好' })
    const { init } = lastRequest()
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ title: '你好' }))
  })

  it('PATCH 与 POST 同规则：无体不声明类型，有体才声明', async () => {
    await apiPatch('posts/1')
    expect((lastRequest().init.headers as Record<string, string>)['Content-Type']).toBeUndefined()

    await apiPatch('posts/1', { title: '改' })
    expect((lastRequest().init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    )
  })

  it('PUT 与 DELETE 不携带请求体', async () => {
    await apiPut('posts/1/like')
    expect(lastRequest().init.method).toBe('PUT')
    expect(lastRequest().init.body).toBeUndefined()

    await apiDelete('posts/1')
    expect(lastRequest().init.method).toBe('DELETE')
    expect(lastRequest().init.body).toBeUndefined()
  })

  it('上传不设置 Content-Type，交给浏览器补 boundary', async () => {
    const form = new FormData()
    form.append('image', new Blob(['x']), 'a.png')
    await apiUpload('uploads/images', form)

    const { init } = lastRequest()
    expect(init.body).toBe(form)
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })
})
