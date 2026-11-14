// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Card } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'
import { StaticPage, StatusLine } from '../_static'
import { fetchNotifications, markAllRead } from './notifications.api'
import { notificationKeys, useUnreadQuery } from './notifications.queries'
import type { NotificationItem } from '../../types/api'

type Cursor = { t: string; id: string } | null

/** 把单条通知转成可读文案与跳转地址；未知类型降级为通用文案，不崩溃。 */
function describe(item: NotificationItem): { text: string; to?: string } {
  if (item.type === 'comment') {
    const who = item.actorDisplayName ?? item.actorUsername ?? '有人'
    const post = item.postTitle ? `《${item.postTitle}》` : '你的帖子'
    return {
      text: `${who} 评论了你的帖子${post}`,
      to: item.postId ? `/posts/${item.postId}` : undefined,
    }
  }
  return { text: '有一条新动态', to: undefined }
}

/** 相对时间：分钟 → 小时 → 天 → 日期，避免每条都显示完整时间戳。 */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  const d = new Date(iso)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

/** 通知中心：消费 /api/notifications，与顶栏铃铛共用未读计数。 */
export function NotificationsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', 'first'],
    queryFn: ({ signal }) => fetchNotifications(null),
  })
  const { data: unreadData } = useUnreadQuery()
  const qc = useQueryClient()

  const [items, setItems] = useState<NotificationItem[]>([])
  const [cursor, setCursor] = useState<Cursor>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (data) {
      setItems(data.items)
      setCursor(data.cursor)
      setHasMore(data.hasMore)
    }
  }, [data])

  const unreadCount = unreadData ?? 0
  const hasUnread = items.some((item) => !item.isRead) || unreadCount > 0

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const next = await fetchNotifications(cursor)
      setItems((prev) => [...prev, ...next.items])
      setCursor(next.cursor)
      setHasMore(next.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }

  async function markAll() {
    await markAllRead()
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })))
    qc.invalidateQueries({ queryKey: notificationKeys.unread })
  }

  return (
    <StaticPage title="通知">
      {hasUnread && (
        <div className="flex justify-end">
          <button type="button" onClick={() => void markAll()} className={buttonClass('ghost', 'sm')}>
            全部标为已读
          </button>
        </div>
      )}
      {isLoading && <StatusLine text="加载中…" />}
      {isError && <StatusLine text="加载失败，请刷新重试。" tone="danger" />}
      {!isLoading && !isError && items.length === 0 && (
        <Card className="p-5">
          <p className="text-sm leading-relaxed text-muted">暂无通知。</p>
        </Card>
      )}
      {items.map((item) => {
        const desc = describe(item)
        const card = (
          <Card
            className={`flex gap-3 p-4 ${
              item.isRead ? '' : 'bg-accent-soft/40 ring-1 ring-accent/30'
            }`}
          >
            <Avatar name={item.actorDisplayName ?? '?'} src={item.actorAvatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-ink">{desc.text}</p>
              <time className="text-xs text-faint">{timeAgo(item.createdAt)}</time>
            </div>
            {!item.isRead && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="未读" />
            )}
          </Card>
        )
        return desc.to ? (
          <Link key={item.id} to={desc.to} className="block">
            {card}
          </Link>
        ) : (
          <div key={item.id}>{card}</div>
        )
      })}
      {hasMore && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className={buttonClass('secondary', 'sm')}
        >
          {loadingMore ? '加载中…' : '加载更多'}
        </button>
      )}
    </StaticPage>
  )
}
