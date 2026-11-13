import type { NextFunction, Request, Response } from 'express'
import { DomainError } from '../../shared/errors.js'
import { sendData } from '../../shared/response.js'

/**
 * 管理域探针：仅回显调用者自身身份，用于验证认证 / 角色守卫是否生效。
 * 不查询业务数据、不接受参数；M6 后台的真实端点将挂在同一 Router 上。
 */
export function adminWhoamiController(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const principal = req.principal
  if (!principal) {
    // 理论不可达（Router 已统一挂载 requireAuth）；保留兜底，保持错误包络一致。
    next(new DomainError('AUTH_REQUIRED', '请先登录'))
    return
  }
  sendData(res, { user: principal, serverTime: new Date().toISOString() })
}
