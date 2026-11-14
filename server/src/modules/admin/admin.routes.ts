// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { ROLE_ADMIN } from '../../config/constants.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { requireRole } from '../../middleware/require-role.js'
import { adminWhoamiController } from './admin.controller.js'
import {
  createInviteCodesController,
  listInviteCodesController,
  revokeInviteCodeController,
} from '../invite/index.js'

/**
 * 管理路由组（挂载于 /api/admin）。
 *
 * 认证与角色校验在 Router 上统一挂载：此后新增任何管理端点都自动受保护，
 * 不依赖每个端点各自记得挂守卫（ARCHITECTURE.md §5.4）。
 * 邀请码管理复用同一组守卫——生成 / 撤销都是运营者专属操作。
 */
export const adminRouter = Router()

adminRouter.use(requireAuth, requireRole(ROLE_ADMIN))
adminRouter.get('/whoami', adminWhoamiController)
adminRouter.get('/invite-codes', listInviteCodesController)
adminRouter.post('/invite-codes', createInviteCodesController)
adminRouter.post('/invite-codes/:id/revoke', revokeInviteCodeController)
