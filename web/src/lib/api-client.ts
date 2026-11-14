// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ApiEnvelope, ApiErrorBody } from '../types/api'

/** 领域错误：由传输层归一化，UI 只处理 code / message。 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId: string
  readonly details?: { field: string; constraint: string }[]

  constructor(
    code: string,
    message: string,
    status: number,
    requestId: string,
    details?: { field: string; constraint: string }[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.requestId = requestId
    this.details = details
  }
}

type RequestOptions = {
  signal?: AbortSignal
  params?: Record<string, string | number | undefined>
}

/** 离线预览（file://）没有后端服务，返回明确的领域错误而非网络异常。 */
function assertOnline(): void {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    throw new ApiError('OFFLINE_PREVIEW', '离线预览未连接后端服务', 0, 'none')
  }
}

function buildUrl(path: string, params?: RequestOptions['params']): URL {
  const url = new URL(`/api/${path.replace(/^\//, '')}`, window.location.origin)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url
}

/** 统一的解包与错误归一化，GET / POST 共用，保证错误形状一致。 */
async function send<T>(url: URL, init: RequestInit): Promise<ApiEnvelope<T>> {
  let response: Response
  try {
    response = await fetch(url, { credentials: 'same-origin', ...init })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('NETWORK_ERROR', '无法连接到服务，请检查网络后重试', 0, 'none')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('INVALID_RESPONSE', '服务返回了无法解析的响应', response.status, 'none')
  }

  if (!response.ok) {
    const body = payload as Partial<ApiErrorBody>
    const error = body.error
    throw new ApiError(
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? '请求失败，请稍后重试',
      response.status,
      error?.requestId ?? 'none',
      error?.details,
    )
  }

  return payload as ApiEnvelope<T>
}

/** 读取资源：拼接 /api、携带同源凭据、解包包络、归一化错误。 */
export async function apiGet<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  assertOnline()
  return send<T>(buildUrl(path, options.params), {
    method: 'GET',
    signal: options.signal,
    headers: { Accept: 'application/json' },
  })
}

/** 写入资源：仅在确实有请求体时才带 JSON 头，避免登出等无体 POST 被判 415。 */
export async function apiPost<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>> {
  assertOnline()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  return send<T>(buildUrl(path), {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** 局部更新资源：PATCH 语义，仅在确有请求体时带 JSON 头。 */
export async function apiPatch<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>> {
  assertOnline()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  return send<T>(buildUrl(path), {
    method: 'PATCH',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** 幂等建立关系：PUT 语义，无请求体（点赞 / 收藏等开关型资源）。 */
export async function apiPut<T>(path: string): Promise<ApiEnvelope<T>> {
  assertOnline()
  return send<T>(buildUrl(path), {
    method: 'PUT',
    headers: { Accept: 'application/json' },
  })
}

/** 删除资源：DELETE 语义，不携带请求体。 */
export async function apiDelete<T>(path: string): Promise<ApiEnvelope<T>> {
  assertOnline()
  return send<T>(buildUrl(path), {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
}

/**
 * 上传文件：multipart/form-data。
 *
 * 刻意不设置 `Content-Type`——浏览器必须自己带 boundary，手写会得到
 * `multipart/form-data` 缺 boundary 的畸形请求，服务端解析直接失败。
 */
export async function apiUpload<T>(path: string, form: FormData): Promise<ApiEnvelope<T>> {
  assertOnline()
  return send<T>(buildUrl(path), {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  })
}
