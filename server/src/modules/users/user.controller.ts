import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { clearSessionCookie } from '../../modules/auth/index.js'
import {
  deleteOwnAccount,
  eraseOwnAccount,
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
    const page = await getPublicPosts(username)
    sendData(res, page)
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
