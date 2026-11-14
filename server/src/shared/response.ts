// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Response } from 'express'
import { ERROR_STATUS, type ErrorCode, type ErrorDetail } from './errors.js'

export type PageMeta = {
  nextCursor: string | null
  hasMore: boolean
}

/** 成功响应统一包络：{ data, meta? }。 */
export function sendData<T>(
  res: Response,
  data: T,
  meta?: PageMeta | Record<string, unknown>,
): void {
  res.status(200).json(meta === undefined ? { data } : { data, meta })
}

/** 错误响应统一包络：{ error: { code, message, details?, requestId } }。 */
export function sendError(
  res: Response,
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: ErrorDetail[],
): void {
  res.status(ERROR_STATUS[code]).json({
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {}),
    },
  })
}
