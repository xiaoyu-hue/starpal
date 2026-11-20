// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge, Card } from '../../components/ui/Primitives'
import { ErrorState } from '../../components/feedback/States'
import { FeedSkeleton } from '../feed'
import { useAdminContentQuery, useSetContentStatusMutation } from './admin.queries'
import type { AdminContent } from '../../types/admin'

/** 帖子 / 评论共用的内容管理页，kind 决定取数端点与文案。 */
export function AdminContentPage({ kind }: { kind: 'posts' | 'comments' }) {
  const isPost = kind === 'posts'
  const query = useAdminContentQuery(kind)
  const statusMutation = useSetContentStatusMutation()
  const [pending, setPending] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const items = query.data?.pages.flatMap((p) => p.items) ?? []

  async function toggle(item: AdminContent) {
    const next = item.status === 'removed' ? 'published' : 'removed'
    if (next === 'removed' && !window.confirm(`移除这条${isPost ? '帖子' : '评论'}？前台将不再显示，可随时恢复。`)) {
      return
    }
    setError(null)
    setPending(item.id)
    try {
      await statusMutation.mutateAsync({ kind, id: item.id, status: next })
    } catch {
      setError('操作失败，请重试')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        含已移除内容。移除只是隐藏，不会删除数据{isPost ? '' : '；评论数会同步增减'}。
      </p>
      {error && (
        <p className="text-sm text-[var(--sp-danger)]" role="alert">
          {error}
        </p>
      )}
      {query.isPending ? (
        <FeedSkeleton count={3} />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">暂无内容，有内容后会出现在这里。</Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">@{item.authorName}</span>
                <Badge variant={item.status === 'published' ? 'topic' : 'warn'}>
                  {item.status === 'published' ? '显示中' : '已移除'}
                </Badge>
                <span className="text-xs text-faint">
                  {new Date(item.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 break-words text-sm text-muted">{item.body}</p>
            </div>
            <Button
              variant={item.status === 'removed' ? 'primary' : 'secondary'}
              size="sm"
              loading={pending === item.id}
              onClick={() => toggle(item)}
            >
              {item.status === 'removed' ? '恢复' : '移除'}
            </Button>
          </Card>
        ))
      )}
      {query.hasNextPage && (
        <div className="text-center">
          <Button
            variant="secondary"
            size="sm"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            加载更多
          </Button>
        </div>
      )}
    </div>
  )
}

/** 路由用无参包装组件，避免在 router 里拼 props。 */
export function AdminPostsPage() {
  return <AdminContentPage kind="posts" />
}

export function AdminCommentsPage() {
  return <AdminContentPage kind="comments" />
}
