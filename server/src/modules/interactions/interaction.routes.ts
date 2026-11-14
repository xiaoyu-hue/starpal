import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth.js'
import {
  bookmarkController,
  likeController,
  unbookmarkController,
  unlikeController,
} from './interaction.controller.js'

/**
 * 互动路由（挂载于 `/api/posts`，与帖子路由同前缀）。
 * 四个端点均为幂等语义：`PUT` 已点赞时返回当前计数，`DELETE` 未点赞时同样返回当前计数。
 * 不提供 `POST /toggle`：显式动作比翻转状态更安全，客户端重放不会把「赞」变成「取消赞」。
 */
export const interactionRouter = Router()

interactionRouter.put('/:id/like', requireAuth, likeController)
interactionRouter.delete('/:id/like', requireAuth, unlikeController)
interactionRouter.put('/:id/bookmark', requireAuth, bookmarkController)
interactionRouter.delete('/:id/bookmark', requireAuth, unbookmarkController)
