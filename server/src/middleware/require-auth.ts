// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { currentUser } from '../modules/auth/auth.service.js'
import { readSessionId } from '../modules/auth/session.js'
import type { AuthPrincipal } from '../shared/types.js'

/**
 * 认证守卫（路由级挂载）：解析会话 Cookie → 查库 → 挂载当前用户主体。
 *
 * 设计要点：
 * - 会话状态以服务端 sessions 表为准，Cookie 只承载不透明随机标识；
 * - 每请求重新查库，账户被停用 / 删除 / 角色变更后立即生效，不依赖缓存；
 * - 复用 currentUser，避免把「过期会话清理、status 校验」等业务规则再写一遍；
 * - 失败统一交给 error-handler 输出 AUTH_REQUIRED 包络，不在此处自行响应。
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await currentUser(readSessionId(req))
    const principal: AuthPrincipal = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    }
    req.principal = principal
    next()
  } catch (error) {
    next(error)
  }
}
