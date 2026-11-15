// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { DomainError } from '../../shared/errors.js'
import { parseCreate, parsePatch } from './announcement.schema.js'
import {
  createAnnouncement,
  getAdminList,
  getFeed,
  removeAnnouncement,
  updateAnnouncementByPatch,
} from './announcement.service.js'

/** 路径参数转正整数；非法值按不存在处理，不让 NaN 进 SQL 变成 500。 */
function requireId(req: Request): number {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('NOT_FOUND', '公告不存在')
  }
  return id
}

/** 公开公告：无需登录。返回置顶、通知、历史档案三段。 */
export async function feedController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendData(res, await getFeed())
  } catch (error) {
    next(error)
  }
}

/** 管理列表：含草稿。整组挂在 adminRouter 的守卫之后，这里不再判角色。 */
export async function adminListController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendData(res, { items: await getAdminList() })
  } catch (error) {
    next(error)
  }
}

export async function createController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await createAnnouncement(req.principal!.id, parseCreate(req.body))
    res.status(201).json({ data: item })
  } catch (error) {
    next(error)
  }
}

export async function updateController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req)
    const item = await updateAnnouncementByPatch(id, req.principal!.id, parsePatch(req.body))
    sendData(res, item)
  } catch (error) {
    next(error)
  }
}

export async function removeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = requireId(req)
    await removeAnnouncement(id)
    // 返回 200 + 包络而非 204：前端统一走 apiDelete 解包，空响应会让 json() 解析失败，
    // 变成「删成功了却弹错误」这种最难查的假故障。
    sendData(res, { id })
  } catch (error) {
    next(error)
  }
}
