import { Router } from 'express'
import { healthController } from './modules/health/health.controller.js'
import {
  aboutController,
  announcementsController,
  disclaimerController,
  metaController,
  privacyController,
  productController,
  termsController,
} from './modules/meta/meta.controller.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { notificationRouter } from './modules/notifications/index.js'
import { userRouter } from './modules/users/user.routes.js'
import { interactionRouter } from './modules/interactions/index.js'
import { commentRouter, postCommentRouter } from './modules/comments/index.js'
import { postRouter } from './modules/posts/index.js'
import { topicRouter } from './modules/topics/index.js'
import { imageRouter } from './modules/images/index.js'
import { imageUploadRouter } from './modules/uploads/index.js'

/**
 * /api 路由汇总：元信息、认证、管理探针、个人资料、内容（帖子）与话题目录。
 * `/api/posts` 由 posts 模块独占——列表、详情、写入同属一个 URL 前缀，
 * 分散到多模块会导致游标规则与可见性判定分处两地。
 * `/api/topics` 只提供目录读取；帖子按话题筛选仍走 `/api/posts?topic=slug`，
 * 保证筛选后的可见性与排序规则与主信息流完全一致。
 * `/api/images` 只做受控读取，字节经存储适配器取回，响应带长缓存头与禁止嗅探头。
 * `/api/posts/:postId/images` 是上传通道，须挂在 `/api/posts` 之前：
 * 帖子路由没有该路径，虽会 fallthrough 到此处，但显式前置可省去一次无谓匹配。
 */
export const apiRouter = Router()

apiRouter.get('/health', healthController)
apiRouter.get('/meta/guidelines', metaController)
apiRouter.get('/meta/privacy', privacyController)
apiRouter.get('/meta/terms', termsController)
apiRouter.get('/meta/announcements', announcementsController)
apiRouter.get('/meta/about', aboutController)
apiRouter.get('/meta/disclaimer', disclaimerController)
apiRouter.get('/meta/product', productController)
apiRouter.use('/auth', authRouter)
apiRouter.use('/admin', adminRouter)
apiRouter.use('/notifications', notificationRouter)
apiRouter.use('/users', userRouter)
apiRouter.use('/posts/:postId/images', imageUploadRouter)
apiRouter.use('/posts', interactionRouter)
apiRouter.use('/posts', postCommentRouter)
apiRouter.use('/posts', postRouter)
apiRouter.use('/comments', commentRouter)
apiRouter.use('/topics', topicRouter)
apiRouter.use('/images', imageRouter)
