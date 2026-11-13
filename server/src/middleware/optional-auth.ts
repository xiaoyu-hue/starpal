import type { NextFunction, Request, Response } from 'express'
import { currentUser } from '../modules/auth/auth.service.js'
import { readSessionId } from '../modules/auth/session.js'
import { isDomainError } from '../shared/errors.js'
import type { AuthPrincipal } from '../shared/types.js'

/**
 * 可选认证：有有效会话则挂载主体，无会话或会话失效则按未登录放行。
 *
 * 用于「公开可读、登录后多看到一些」的端点——帖子详情与列表需要据此判断
 * 调用方是否为作者（草稿可见性）或管理员（已移除内容可见性）。
 * 与 requireAuth 的区别：不因缺少会话而拒绝请求。
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = readSessionId(req)
    if (sessionId !== null) {
      try {
        const user = await currentUser(sessionId)
        const principal: AuthPrincipal = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          avatarUrl: user.avatarUrl,
        }
        req.principal = principal
      } catch (error) {
        // 会话无效属预期情形，降级为匿名；数据库等基础设施错误仍需上抛。
        if (!isDomainError(error)) throw error
      }
    }
    next()
  } catch (error) {
    next(error)
  }
}
