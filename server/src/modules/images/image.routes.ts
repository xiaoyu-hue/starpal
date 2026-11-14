import { Router } from 'express'
import { imageReadController } from './image.controller.js'

/**
 * 图片路由（挂载于 `/api/images`）。
 *
 * 只提供受控读取：`GET /api/images/:key`。上传走 `POST /api/posts/:id/images`，
 * 由 uploads 模块拥有——读取与写入的可见性口径不同，不放在同一路由文件里。
 * 不加认证中间件：图片是公开内容的组成部分，匿名浏览必须能加载；
 * 键为 32 位随机值，不可枚举。
 */
export const imageRouter = Router()

imageRouter.get('/:key', imageReadController)
