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

/** 统一请求层：拼接 /api、携带同源凭据、解包包络、归一化错误。 */
export async function apiGet<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  // 离线预览（file://）没有后端服务，返回明确的领域错误而非网络异常。
  if (window.location.protocol === 'file:') {
    throw new ApiError('OFFLINE_PREVIEW', '离线预览未连接后端服务', 0, 'none')
  }

  const url = new URL(`/api/${path.replace(/^\//, '')}`, window.location.origin)
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      signal: options.signal,
      headers: { Accept: 'application/json' },
    })
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
