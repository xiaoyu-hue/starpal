import { Router } from 'express'
import { healthController } from './modules/health/health.controller.js'
import { metaController } from './modules/meta/meta.controller.js'
import { feedRouter } from './modules/feed/feed.routes.js'

/** /api 路由汇总：元信息与信息流，其余模块在后续里程碑挂载。 */
export const apiRouter = Router()

apiRouter.get('/health', healthController)
apiRouter.get('/meta/guidelines', metaController)
apiRouter.use(feedRouter)
