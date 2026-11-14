import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { parsePostId } from './interaction.schema.js'
import { setBookmark, setLike } from './interaction.service.js'

/** 互动控制器：`PUT` 为建立、`DELETE` 为撤销，均为幂等操作，重复请求不报错。 */

async function handle(
  req: Request,
  res: Response,
  next: NextFunction,
  run: (postId: number, userId: string) => Promise<unknown>,
): Promise<void> {
  try {
    const postId = parsePostId(req.params.id)
    sendData(res, await run(postId, req.principal!.id))
  } catch (error) {
    next(error)
  }
}

export async function likeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handle(req, res, next, (postId, userId) => setLike(postId, userId, true))
}

export async function unlikeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await handle(req, res, next, (postId, userId) => setLike(postId, userId, false))
}

export async function bookmarkController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await handle(req, res, next, (postId, userId) => setBookmark(postId, userId, true))
}

export async function unbookmarkController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await handle(req, res, next, (postId, userId) => setBookmark(postId, userId, false))
}
