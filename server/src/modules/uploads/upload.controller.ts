import type { NextFunction, Request, Response } from 'express'
import { DomainError } from '../../shared/errors.js'
import { parsePostIdParam } from './upload.schema.js'
import { attachImage } from './upload.service.js'

/**
 * 图片上传控制器（`POST /api/posts/:postId/images`）。
 * 成功返回 201 + 新图片记录；前端据 `url` 直接渲染预览。
 */
export async function attachImageController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const principal = req.principal
    if (principal === undefined) {
      // requireAuth 已在前置中间件拦截，此处仅作类型收窄与兜底。
      throw new DomainError('AUTH_REQUIRED', '请先登录')
    }

    const postId = parsePostIdParam(req.params.postId)
    const file = req.file
    if (file === undefined) {
      throw new DomainError('VALIDATION_FAILED', '请选择要上传的图片（字段名 image）')
    }

    const image = await attachImage(
      postId,
      { id: principal.id, role: principal.role },
      { buffer: file.buffer, originalName: file.originalname },
    )
    res.status(201).json({ data: image })
  } catch (error) {
    next(error)
  }
}
