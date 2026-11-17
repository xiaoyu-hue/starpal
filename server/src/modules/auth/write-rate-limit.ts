// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import type { SecurityEventKind } from '../../config/constants.js'
import { recordEvent } from './auth.repository.js'
import { enforceRateLimit } from './rate-limit.js'
import { subjectHashOf } from './subject.js'

/**
 * 写接口通用限流中间件（安全加固）。
 *
 * 复用注册 / 登录那套「落库的不可逆来源摘要」计数，不引入内存计数器——
 * Vercel Serverless 每次调用可能落在不同实例，进程内存各自为政、形同虚设。
 *
 * 顺序刻意是「先检查、后记录」：先数时间窗内已有事件，达到阈值即 429；
 * 未达阈值才把本次尝试记进去。被拒的请求不写入，避免自己不断给自己续期。
 * 不调用 note() 里的清理逻辑：过期数据已由认证链路的 note() 随真实流量推进，
 * 每个写请求都做一次全表 DELETE 是没必要的开销。
 *
 * 用法：requireAuth 之后、业务控制器之前挂载；写接口一律 requireAuth，
 * 因此不会把匿名探测计入已登录用户的配额。
 */
export function writeRateLimit(kind: SecurityEventKind) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const subject = subjectHashOf(req)
      await enforceRateLimit(kind, subject)
      await recordEvent(kind, subject)
      next()
    } catch (error) {
      next(error)
    }
  }
}
