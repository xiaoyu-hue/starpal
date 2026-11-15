// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { optionalAuth } from '../../middleware/optional-auth.js'
import { timelineController, weeklyController } from './achievement.controller.js'

/**
 * 成就路由（挂载于 /api/achievements）。
 *
 * 两个端点都公开：成就是展示性信息，与个人资料同属「谁都能看」的范畴（已确认的口径）。
 * `/weekly` 必须写在 `/:username` 之前，否则会被用户名参数捕获。
 * 本周热门挂 optionalAuth 只为补 `isLiked` / `isBookmarked` 标记，不影响可见性。
 */
export const achievementRouter = Router()

achievementRouter.get('/weekly', optionalAuth, weeklyController)
achievementRouter.get('/:username', timelineController)
