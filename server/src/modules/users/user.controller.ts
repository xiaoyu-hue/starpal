// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { clearSessionCookie } from '../../modules/auth/index.js'
import {
  deleteOwnAccount,
  eraseOwnAccount,
  getOwnBookmarks,
  getOwnProfile,
  getPublicPosts,
  getPublicProfile,
  updateOwnProfile,
} from './user.service.js'

/** 个人资料控制器：参数解析 → 服务层 → 统一包络。 */

export async function publicProfileController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const username = String(req.params.username ?? '')
    const profile = await getPublicProfile(username)
    sendData(res, { profile })
  } catch (error) {
    next(error)
  }
}

export async function publicPostsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const username = String(req.params.username ?? '')
    // 先确认用户存在，不存在按 NOT_FOUND 处理，与公开投影保持一致。
    await getPublicProfile(username)
    const page = await getPublicPosts(username, req.query.cursor, req.principal?.id ?? null)
    // 与 /api/posts 同构：data 为列表，meta 承载游标，前端两处共用同一解包逻辑。
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}

export async function ownProfileController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await getOwnProfile(req.principal!.id)
    sendData(res, { profile })
  } catch (error) {
    next(error)
  }
}

export async function updateProfileController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await updateOwnProfile(req.principal!.id, req.body)
    sendData(res, { profile })
  } catch (error) {
    next(error)
  }
}

export async function deleteAccountController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteOwnAccount(req.principal!.id)
    // 账号已失效，清除会话 Cookie，使本地立即进入未登录态。
    clearSessionCookie(req, res)
    sendData(res, { deleted: true })
  } catch (error) {
    next(error)
  }
}

export async function eraseAccountController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await eraseOwnAccount(req.principal!.id)
    clearSessionCookie(req, res)
    sendData(res, { erased: true })
  } catch (error) {
    next(error)
  }
}

/** 本人收藏列表：登录校验由 /me 路由组统一承担，这里只取 principal.id，不接受用户标识入参。 */
export async function myBookmarksController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = await getOwnBookmarks(req.principal!.id, req.query.cursor)
    // 与 /api/posts、/:username/posts 同构：data 为列表，meta 承载游标，前端共用解包逻辑。
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}
