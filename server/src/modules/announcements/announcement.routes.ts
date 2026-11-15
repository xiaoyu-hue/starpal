// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import {
  adminListController,
  createController,
  removeController,
  updateController,
} from './announcement.controller.js'

/**
 * 公告管理路由（挂载于 `/api/admin/announcements`）。
 *
 * 守卫不在这里写：`adminRouter` 已在整组上挂 `requireAuth + requireRole(ROLE_ADMIN)`，
 * 由它转发过来的请求必然已通过校验。重复挂一遍只会让人误以为漏挂过。
 */
export const announcementAdminRouter = Router()

announcementAdminRouter.get('/', adminListController)
announcementAdminRouter.post('/', createController)
announcementAdminRouter.patch('/:id', updateController)
announcementAdminRouter.delete('/:id', removeController)
