// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth.js'
import { exportController } from './export.controller.js'

/**
 * 导出路由（挂载于 `/api/export`）。
 *
 * 必须登录：导出物严格限定为本人数据，未登录无从判断「本人」是谁，
 * 由 `requireAuth` 统一输出 AUTH_REQUIRED，不在这里自行响应。
 */
export const exportRouter = Router()

exportRouter.get('/', requireAuth, exportController)
