// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import {
  countUnread,
  listNotifications,
  markAllRead,
  type Cursor,
  type NotificationRow,
} from './notification.repository.js'

export type { Cursor } from './notification.repository.js'

/**
 * 通知业务层：只做读取与标记，不产生通知（产生方在各自的写事务内）。
 * 列表限流与游标归一化在此完成，控制器不再关心页码边界。
 */

export type NotificationItem = NotificationRow

export const NOTIFICATION_PAGE_MAX = 50

export async function listNotificationsFor(
  userId: string,
  cursor: Cursor,
  limit: number,
): Promise<{ items: NotificationItem[]; hasMore: boolean; cursor: Cursor }> {
  const safeLimit = Math.min(Math.max(1, Number.isInteger(limit) ? limit : 20), NOTIFICATION_PAGE_MAX)
  const { rows, hasMore } = await listNotifications(pool, userId, cursor, safeLimit)
  const nextCursor: Cursor =
    hasMore && rows.length > 0
      ? { t: rows[rows.length - 1]!.createdAt, id: String(rows[rows.length - 1]!.id) }
      : null
  return { items: rows, hasMore, cursor: nextCursor }
}

export async function countUnreadFor(userId: string): Promise<number> {
  return countUnread(pool, userId)
}

export async function markAllReadFor(userId: string): Promise<number> {
  return markAllRead(pool, userId)
}
