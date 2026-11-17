// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth.js'
import { singleImageUpload } from '../../middleware/upload.js'
import { writeRateLimit } from '../auth/index.js'
import { attachImageController, removeImageController } from './upload.controller.js'

/**
 * 图片上传路由（挂载于 `/api/posts/:postId/images`）。
 *
 * 顺序有讲究：先 `requireAuth` 再 `singleImageUpload`——未登录请求不必先收完
 * 3 MB 请求体再拒绝，能省带宽也少一次大内存分配。
 * `mergeParams` 让本路由能读到父级路径上的 `:postId`。
 */
export const imageUploadRouter = Router({ mergeParams: true })

imageUploadRouter.post(
  '/',
  requireAuth,
  writeRateLimit('image_upload'),
  singleImageUpload,
  attachImageController,
)

// 移除不经过 multer：DELETE 无请求体，走 multipart 解析只会白等一次流。
imageUploadRouter.delete('/:imageId', requireAuth, removeImageController)
