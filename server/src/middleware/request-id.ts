// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

/** 生成请求标识，贯穿访问日志与错误响应。 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id')
  const id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : `req_${randomUUID()}`
  req.context = { requestId: id, startedAt: Date.now() }
  res.setHeader('X-Request-Id', id)
  next()
}
