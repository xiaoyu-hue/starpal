import { apiGet, apiPost } from '../../lib/api-client'
import type { NotificationList } from '../../types/api'

/** 通知接口：与后端 /api/notifications 对应，列表支持键集游标翻页。 */

/** 列表：cursor 为上一页返回的游标，首次传 null。 */
export async function fetchNotifications(
  cursor?: { t: string; id: string } | null,
  limit = 20,
): Promise<NotificationList> {
  const params: Record<string, string | number> = { limit }
  if (cursor) {
    params.t = cursor.t
    params.id = cursor.id
  }
  const envelope = await apiGet<NotificationList>('notifications', { params })
  return envelope.data
}

/** 未读数：供顶栏铃铛红点。未登录时调用方不应启用本查询。 */
export async function fetchUnread(): Promise<number> {
  const envelope = await apiGet<{ unread: number }>('notifications/unread')
  return envelope.data.unread
}

/** 全部标为已读：返回本次更新的条数。 */
export async function markAllRead(): Promise<number> {
  const envelope = await apiPost<{ updated: number }>('notifications/read')
  return envelope.data.updated
}
