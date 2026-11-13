import express, { type NextFunction, type Request, type Response } from 'express'
import { appEnv } from '../config/env.js'
import { DomainError } from '../shared/errors.js'

/** 请求体上限与内容类型检查：非法类型交由错误中间件归一化为统一包络。 */
export function bodyLimit(req: Request, res: Response, next: NextFunction): void {
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method)
  if (hasBody && req.is('application/json') === false) {
    next(new DomainError('UNSUPPORTED_MEDIA_TYPE', '仅接受 application/json 请求体'))
    return
  }
  express.json({ limit: appEnv.maxBodyBytes })(req, res, (error: unknown) => {
    if (error) {
      next(new DomainError('PAYLOAD_TOO_LARGE', '请求体超过大小上限'))
      return
    }
    next()
  })
}
