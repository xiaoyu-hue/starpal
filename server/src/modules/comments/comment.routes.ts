// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { optionalAuth } from '../../middleware/optional-auth.js'
import { requireAuth } from '../../middleware/require-auth.js'
import {
  createCommentController,
  deleteCommentController,
  listCommentsController,
} from './comment.controller.js'

/**
 * 评论路由。
 *
 * 读路径用 `optionalAuth`：登录读者需要拿到 `isAuthor` / `canRemove`，
 * 匿名读者照样能看列表——列表本身是公开内容，不能因为没登录就 401。
 * 写路径一律 `requireAuth`；具体能不能删由服务层按「作者 / 管理员」判定。
 */
export const postCommentRouter = Router()

postCommentRouter.get('/:postId/comments', optionalAuth, listCommentsController)
postCommentRouter.post('/:postId/comments', requireAuth, createCommentController)

export const commentRouter = Router()

commentRouter.delete('/:id', requireAuth, deleteCommentController)
