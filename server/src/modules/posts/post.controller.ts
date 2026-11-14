// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import type { AuthPrincipal } from '../../shared/types.js'
import { parseCreateInput, parseFeedQuery, parsePostId, parseUpdateInput } from './post.schema.js'
import {
  createPost,
  deletePost,
  getPostDetail,
  listFeed,
  listRelated,
  updatePost,
  type Viewer,
} from './post.service.js'

/** 帖子控制器：参数解析 → 服务层 → 统一包络。权限以 principal 为准，不采信请求体。 */

function viewerOf(principal: AuthPrincipal | undefined): Viewer {
  return principal ? { id: principal.id, role: principal.role } : null
}

export async function feedController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = parseFeedQuery(req.query as Record<string, unknown>)
    const page = await listFeed(query, viewerOf(req.principal))
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}

export async function createPostController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = parseCreateInput(req.body)
    const post = await createPost(req.principal!.id, input)
    res.status(201).json({ data: post })
  } catch (error) {
    next(error)
  }
}

export async function postDetailController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parsePostId(req.params.id)
    const post = await getPostDetail(id, viewerOf(req.principal))
    sendData(res, post)
  } catch (error) {
    next(error)
  }
}

export async function updatePostController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parsePostId(req.params.id)
    const input = parseUpdateInput(req.body)
    const post = await updatePost(id, viewerOf(req.principal), input)
    sendData(res, post)
  } catch (error) {
    next(error)
  }
}

export async function deletePostController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parsePostId(req.params.id)
    await deletePost(id, viewerOf(req.principal))
    sendData(res, { deleted: true })
  } catch (error) {
    next(error)
  }
}

export async function relatedPostsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parsePostId(req.params.id)
    const items = await listRelated(id, viewerOf(req.principal))
    sendData(res, items)
  } catch (error) {
    next(error)
  }
}
