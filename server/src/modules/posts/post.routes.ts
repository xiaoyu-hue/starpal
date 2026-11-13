import { Router } from 'express'
import { optionalAuth } from '../../middleware/optional-auth.js'
import { requireAuth } from '../../middleware/require-auth.js'
import {
  createPostController,
  deletePostController,
  feedController,
  postDetailController,
  relatedPostsController,
  updatePostController,
} from './post.controller.js'

/**
 * 帖子路由（挂载于 /api/posts）。
 *
 * 读端点挂 optionalAuth 而非 requireAuth：匿名可读已发布内容，
 * 登录者可额外看到自己的草稿与管理员可见的已移除内容。
 * 写端点一律 requireAuth，作者 / 管理员判定在服务层完成。
 * `/related` 须先于 `/:id` 注册，保证同前缀下先匹配具体段。
 */
export const postRouter = Router()

postRouter.get('/', optionalAuth, feedController)
postRouter.post('/', requireAuth, createPostController)
postRouter.get('/:id/related', optionalAuth, relatedPostsController)
postRouter.get('/:id', optionalAuth, postDetailController)
postRouter.patch('/:id', requireAuth, updatePostController)
postRouter.delete('/:id', requireAuth, deletePostController)
