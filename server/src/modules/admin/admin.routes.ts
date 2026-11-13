import { Router } from 'express'
import { ROLE_ADMIN } from '../../config/constants.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { requireRole } from '../../middleware/require-role.js'
import { adminWhoamiController } from './admin.controller.js'

/**
 * 管理路由组（挂载于 /api/admin）。
 *
 * 认证与角色校验在 Router 上统一挂载：此后新增任何管理端点都自动受保护，
 * 不依赖每个端点各自记得挂守卫（ARCHITECTURE.md §5.4）。
 * 当前只有一个探针端点；它是 M6 后台的挂载骨架，不是业务功能。
 */
export const adminRouter = Router()

adminRouter.use(requireAuth, requireRole(ROLE_ADMIN))
adminRouter.get('/whoami', adminWhoamiController)
