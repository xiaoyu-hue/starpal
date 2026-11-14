// SPDX-License-Identifier: AGPL-3.0-or-later
/** 领域错误码与 HTTP 状态映射，集中定义；控制器只抛领域错误。 */
export const ERROR_STATUS = {
  VALIDATION_FAILED: 400,
  AUTH_REQUIRED: 401,
  INVALID_CREDENTIALS: 401,
  INVITE_INVALID: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UNSUPPORTED_MEDIA_TYPE: 415,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_ERROR: 500,
} as const

export type ErrorCode = keyof typeof ERROR_STATUS

export type ErrorDetail = { field: string; constraint: string }

export class DomainError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: ErrorDetail[]

  constructor(code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.status = ERROR_STATUS[code]
    this.details = details
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError
}
