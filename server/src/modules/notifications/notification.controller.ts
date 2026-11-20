// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import {
  NOTIFICATION_PAGE_MAX,
  countUnreadFor,
  listNotificationsFor,
  markAllReadFor,
  type Cursor,
} from './notification.service.js'

/** 通知控制器：列表 / 未读数 / 全部已读，三者均要求登录（路由已统一挂载 requireAuth）。 */

/**
 * 解析键集游标。裸 `?t=&id=` 是本项目通知模块的既定契约（前端原样回传上一页 cursor），
 * 故不能改用 base64 decodeCursor——那会破坏前端。改为在入库前校验：
 * t 必须是可解析的 ISO 时间、id 必须是正整数字符串；任一非法即视为无游标（回到第一页），
 * 避免畸形时间串进入 `$2::timestamptz` 触发 500 与错误日志噪声（攻防模拟 P4）。
 */
function parseCursor(query: Record<string, unknown>): Cursor {
  const t = typeof query.t === 'string' ? query.t : null
  const id = typeof query.id === 'string' ? query.id : null
  if (t === null || id === null) return null
  if (!Number.isFinite(Date.parse(t))) return null
  if (!/^\d+$/.test(id) || Number(id) <= 0) return null
  return { t, id }
}

function parseLimit(query: Record<string, unknown>): number {
  const raw = Number(query.limit)
  if (!Number.isInteger(raw) || raw <= 0) return 20
  return Math.min(raw, NOTIFICATION_PAGE_MAX)
}

export async function notificationListController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listNotificationsFor(req.principal!.id, parseCursor(req.query), parseLimit(req.query))
    sendData(res, result)
  } catch (error) {
    next(error)
  }
}

export async function notificationUnreadController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const unread = await countUnreadFor(req.principal!.id)
    sendData(res, { unread })
  } catch (error) {
    next(error)
  }
}

export async function notificationMarkReadController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await markAllReadFor(req.principal!.id)
    sendData(res, { updated })
  } catch (error) {
    next(error)
  }
}
