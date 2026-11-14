// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Request } from 'express'

/** 请求上下文：由 request-id 中间件挂载，贯穿日志与错误响应。 */
export type RequestContext = {
  requestId: string
  startedAt: number
}

/**
 * 认证主体：由 require-auth 中间件在路由级挂载。
 * 只保留界面与安全判定所需字段，不含密码哈希、创建时间等内部信息。
 */
export type AuthPrincipal = {
  id: string
  username: string
  displayName: string
  role: string
  avatarUrl: string | null
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      context: RequestContext
      principal?: AuthPrincipal
    }
  }
}

export function requestIdOf(req: Request): string {
  return req.context?.requestId ?? 'req_unknown'
}
