// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { optionalAuth } from '../../middleware/optional-auth.js'
import { searchController } from './search.controller.js'

/**
 * 搜索路由（挂载于 /api/search）。
 * 挂 optionalAuth 而非 requireAuth：搜索的是全站公开内容，匿名即可用；
 * 登录者仅额外获得 isLiked / isBookmarked 标记，不改变可见结果集。
 */
export const searchRouter = Router()

searchRouter.get('/', optionalAuth, searchController)
