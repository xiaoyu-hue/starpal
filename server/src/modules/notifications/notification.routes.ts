// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth.js'
import {
  notificationListController,
  notificationMarkReadController,
  notificationUnreadController,
} from './notification.controller.js'

/**
 * 通知路由组（挂载于 /api/notifications）。
 *
 * 认证在 Router 上统一挂载：列表、未读数、全部已读都属个人数据，
 * 任何端点漏挂守卫都会导致越权读他人通知。
 */
export const notificationRouter = Router()

notificationRouter.use(requireAuth)
notificationRouter.get('/', notificationListController)
notificationRouter.get('/unread', notificationUnreadController)
notificationRouter.post('/read', notificationMarkReadController)
