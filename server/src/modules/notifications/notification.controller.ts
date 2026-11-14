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

function parseCursor(query: Record<string, unknown>): Cursor {
  const t = typeof query.t === 'string' ? query.t : null
  const id = typeof query.id === 'string' ? query.id : null
  return t !== null && id !== null ? { t, id } : null
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
