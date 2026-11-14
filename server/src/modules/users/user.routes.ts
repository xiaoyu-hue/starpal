// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { optionalAuth } from '../../middleware/optional-auth.js'
import { requireAuth } from '../../middleware/require-auth.js'
import {
  deleteAccountController,
  eraseAccountController,
  myBookmarksController,
  myLikesController,
  ownProfileController,
  publicPostsController,
  publicProfileController,
  updateProfileController,
} from './user.controller.js'

/**
 * 个人资料路由（挂载于 /api/users）。
 *
 * 公开端点（`/:username` 及其帖子）无需登录；
 * `/me` 一组统一挂载 requireAuth，与 admin 路由组保持一致的安全装配策略，
 * 后续新增「本人」端点自动受保护，不依赖逐端点挂守卫。
 * 字面路由 `/me` 须先于参数路由 `/:username`，避免被用户名参数捕获。
 */
export const userRouter = Router()

const meRouter = Router()
meRouter.get('/', ownProfileController)
meRouter.get('/bookmarks', myBookmarksController)
meRouter.get('/likes', myLikesController)
meRouter.patch('/', updateProfileController)
meRouter.delete('/', deleteAccountController)
meRouter.post('/erase', eraseAccountController)

userRouter.use('/me', requireAuth, meRouter)
userRouter.get('/:username/posts', optionalAuth, publicPostsController)
userRouter.get('/:username', publicProfileController)
