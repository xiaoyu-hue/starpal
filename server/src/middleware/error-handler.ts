// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { isDomainError } from '../shared/errors.js'
import { sendError } from '../shared/response.js'
import { requestIdOf } from '../shared/types.js'

/** 集中错误归一化：领域错误按码映射，未预期错误不泄露堆栈与 SQL。 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = requestIdOf(req)
  if (isDomainError(error)) {
    sendError(res, error.code, error.message, requestId, error.details)
    return
  }
  console.error(
    JSON.stringify({
      at: 'unhandled',
      requestId,
      path: req.path.split('?')[0],
      message: error instanceof Error ? error.message : String(error),
    }),
  )
  sendError(res, 'INTERNAL_ERROR', '服务暂时不可用，请稍后重试', requestId)
}
