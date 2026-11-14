// SPDX-License-Identifier: AGPL-3.0-or-later
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
  if (!isWriteMethod) {
    // 读请求没有请求体，不必进入解析器（避免为一个 GET 构造解析器实例）。
    next()
    return
  }

  // multipart 由上传路由自管（multer 的 fileSize 限制），此处只兜总量。
  // 不在此处强制 application/json：上传接口本就只接受 multipart，交给它自己判定。
  if (req.is('multipart/form-data')) {
    const declaredLength = Number(req.header('content-length') ?? '0')
    if (Number.isFinite(declaredLength) && declaredLength > appEnv.maxBodyBytes) {
      next(new DomainError('PAYLOAD_TOO_LARGE', '请求体超过大小上限'))
      return
    }
    next()
    return
  }

  // 仅当写方法且确实携带请求体时，才强制 application/json。
  // 登出等无体 POST 直接放行，避免 415 使会话无法失效。
  if (hasRequestBody(req) && req.is('application/json') === false) {
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
