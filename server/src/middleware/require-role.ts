import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { Role } from '../config/constants.js'
import { DomainError } from '../shared/errors.js'

/**
 * 角色守卫工厂：传入允许的角色，返回路由级中间件。
 *
 * 两条硬约束：
 * - 必须先挂载 requireAuth。未挂载时这里直接拒绝，而不是静默放行，
 *   避免「忘了挂认证守卫」被误当成「允许匿名访问」。
 * - 管理路由应在 Router 上一次性 use(requireAuth, requireRole(...))，
 *   而不是逐端点挂载，防止后续新增端点时漏挂（ARCHITECTURE.md §5.4）。
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  const permitted = new Set<string>(allowed)
  return (req: Request, _res: Response, next: NextFunction): void => {
    const principal = req.principal
    if (!principal) {
      next(new DomainError('AUTH_REQUIRED', '请先登录'))
      return
    }
    if (!permitted.has(principal.role)) {
      next(new DomainError('FORBIDDEN', '无权访问该资源'))
      return
    }
    next()
  }
}
