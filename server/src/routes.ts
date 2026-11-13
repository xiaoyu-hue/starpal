import { Router } from 'express'
import { healthController } from './modules/health/health.controller.js'
import { aboutController, metaController, privacyController } from './modules/meta/meta.controller.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { userRouter } from './modules/users/user.routes.js'
import { postRouter } from './modules/posts/index.js'

/**
 * /api 路由汇总：元信息、认证、管理探针、个人资料与内容（帖子）。
 * `/api/posts` 由 posts 模块独占——列表、详情、写入同属一个 URL 前缀，
 * 分散到多模块会导致游标规则与可见性判定分处两地。
 */
export const apiRouter = Router()

apiRouter.get('/health', healthController)
apiRouter.get('/meta/guidelines', metaController)
apiRouter.get('/meta/privacy', privacyController)
apiRouter.get('/meta/about', aboutController)
apiRouter.use('/auth', authRouter)
apiRouter.use('/admin', adminRouter)
apiRouter.use('/users', userRouter)
apiRouter.use('/posts', postRouter)
