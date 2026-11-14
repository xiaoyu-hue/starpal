// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth.js'
import { myReportsController, submitReportController } from './report.controller.js'

/**
 * 用户侧举报 / 申诉路由（挂载于 /api/reports）。
 *
 * 整组统一挂 requireAuth：新增端点自动受保护，不依赖逐端点记得挂守卫。
 * 管理端（队列与决策）挂在 adminRouter 下，复用其 requireAuth + requireRole(admin)，
 * 不在此处重复一套角色校验。
 */
export const reportRouter = Router()

reportRouter.use(requireAuth)
reportRouter.post('/', submitReportController)
reportRouter.get('/mine', myReportsController)
