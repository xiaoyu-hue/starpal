// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { parseCommentId, parseCommentQuery, parseCreateInput, parsePostId } from './comment.schema.js'
import { createComment, deleteComment, listPostComments } from './comment.service.js'

/** 评论控制器：解析 → 服务层 → 统一包络。权限以 principal 为准，不采信请求体。 */

export async function listCommentsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = parsePostId(req.params.postId)
    const query = parseCommentQuery(req.query as Record<string, unknown>)
    const viewer = req.principal ?? null
    const page = await listPostComments(postId, query, viewer)
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}

export async function createCommentController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = parsePostId(req.params.postId)
    const input = parseCreateInput(req.body)
    sendData(res, await createComment(postId, req.principal!, input))
  } catch (error) {
    next(error)
  }
}

export async function deleteCommentController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteComment(parseCommentId(req.params.id), req.principal!)
    sendData(res, { deleted: true })
  } catch (error) {
    next(error)
  }
}
