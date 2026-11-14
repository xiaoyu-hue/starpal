import { Router } from 'express'
import { topicListController } from './topic.controller.js'

/**
 * 话题路由（挂载于 /api/topics）。
 * 列表公开可读，不挂认证中间件：话题目录是浏览入口，匿名用户同样需要它来发帖前挑选分类。
 */
export const topicRouter = Router()

topicRouter.get('/', topicListController)
