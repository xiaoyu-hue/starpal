// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'

/** 结构化访问日志：仅记录方法、路径、状态与耗时，不记录请求体与凭据。 */
export function accessLog(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const duration = Date.now() - (req.context?.startedAt ?? Date.now())
    const path = req.path.split('?')[0] ?? req.path
    console.log(
      JSON.stringify({
        at: 'access',
        requestId: req.context?.requestId ?? 'unknown',
        method: req.method,
        path,
        status: res.statusCode,
        ms: duration,
      }),
    )
  })
  next()
}
