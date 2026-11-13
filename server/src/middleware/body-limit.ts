import express, { type NextFunction, type Request, type Response } from 'express'
import { appEnv } from '../config/env.js'
import { DomainError } from '../shared/errors.js'

/** 是否声明了请求体：无体的 POST（如登出）不应被内容类型校验误拦。 */
function hasRequestBody(req: Request): boolean {
  const length = req.header('content-length')
  if (length !== undefined) return Number(length) > 0
  return req.header('transfer-encoding') !== undefined
}

/** 请求体上限与内容类型检查：非法类型交由错误中间件归一化为统一包络。 */
export function bodyLimit(req: Request, res: Response, next: NextFunction): void {
  const isWriteMethod = ['POST', 'PUT', 'PATCH'].includes(req.method)
  // 仅当写方法且确实携带请求体时，才强制 application/json。
  // 登出等无体 POST 直接放行，避免 415 使会话无法失效。
  if (isWriteMethod && hasRequestBody(req) && req.is('application/json') === false) {
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
