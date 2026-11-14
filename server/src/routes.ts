import { Router } from 'express'
import { healthController } from './modules/health/health.controller.js'
import { aboutController, metaController, privacyController } from './modules/meta/meta.controller.js'
import { feedRouter } from './modules/feed/feed.routes.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { userRouter } from './modules/users/user.routes.js'

/** /api 路由汇总：元信息、认证、管理探针、个人资料与信息流，其余模块在后续里程碑挂载。 */
export const apiRouter = Router()

apiRouter.get('/health', healthController)
apiRouter.get('/meta/guidelines', metaController)
apiRouter.get('/meta/privacy', privacyController)
apiRouter.get('/meta/about', aboutController)
apiRouter.use('/auth', authRouter)
apiRouter.use('/admin', adminRouter)
apiRouter.use('/users', userRouter)
apiRouter.use(feedRouter)
