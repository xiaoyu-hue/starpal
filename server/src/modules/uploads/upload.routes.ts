import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth.js'
import { singleImageUpload } from '../../middleware/upload.js'
import { attachImageController } from './upload.controller.js'

/**
 * 图片上传路由（挂载于 `/api/posts/:postId/images`）。
 *
 * 顺序有讲究：先 `requireAuth` 再 `singleImageUpload`——未登录请求不必先收完
 * 3 MB 请求体再拒绝，能省带宽也少一次大内存分配。
 * `mergeParams` 让本路由能读到父级路径上的 `:postId`。
 */
export const imageUploadRouter = Router({ mergeParams: true })

imageUploadRouter.post('/', requireAuth, singleImageUpload, attachImageController)
