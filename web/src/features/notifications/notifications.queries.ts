import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUnread } from './notifications.api'

/** 缓存键：列表与未读分离，标记已读后只失效未读，不动列表缓存。 */
export const notificationKeys = {
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
}

/** 顶栏铃铛未读数：仅登录后启用，避免未登录反复 401。 */
export function useUnreadQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: ({ signal }) => fetchUnread(),
    enabled,
  })
}

/** 标记已读后让顶栏红点归零，列表由页面本地状态同步。 */
export function useInvalidateNotifications() {
  const qc = useQueryClient()
  return {
    invalidateUnread: () => qc.invalidateQueries({ queryKey: notificationKeys.unread }),
  }
}
