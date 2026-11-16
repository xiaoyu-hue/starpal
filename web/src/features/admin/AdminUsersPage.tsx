// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge, Card } from '../../components/ui/Primitives'
import { ErrorState } from '../../components/feedback/States'
import { FeedSkeleton } from '../feed'
import { useAdminUsersQuery, useSetUserStatusMutation } from './admin.queries'
import type { AdminUser } from '../../types/admin'

const STATUS_LABEL: Record<string, string> = {
  active: '正常',
  suspended: '已停用',
  deleted: '已注销',
}
const ROLE_LABEL: Record<string, string> = { admin: '管理员', user: '成员' }

export function AdminUsersPage() {
  const query = useAdminUsersQuery()
  const statusMutation = useSetUserStatusMutation()
  const [pending, setPending] = useState<number | null>(null)
  const users = query.data?.pages.flatMap((p) => p.items) ?? []

  function toggle(user: AdminUser) {
    if (user.status === 'deleted') return
    const next = user.status === 'suspended' ? 'active' : 'suspended'
    if (next === 'suspended' && !window.confirm(`停用 @${user.username}？其帖子与评论将从前台隐藏，可随时恢复。`)) {
      return
    }
    setPending(user.id)
    statusMutation.mutate(
      { id: user.id, status: next },
      { onSettled: () => setPending(null) },
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">按注册时间倒序。停用会隐藏该成员的内容，不会删除任何数据。</p>
      {query.isPending ? (
        <FeedSkeleton count={3} />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : users.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">还没有成员，有成员注册后会显示在这里。</Card>
      ) : (
        users.map((u) => (
          <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">@{u.username}</span>
                <Badge variant="neutral">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                <Badge variant={u.status === 'active' ? 'topic' : 'warn'}>
                  {STATUS_LABEL[u.status] ?? u.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-faint">
                {u.displayName} · 加入于 {new Date(u.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
            {u.status !== 'deleted' && (
              <Button
                variant={u.status === 'suspended' ? 'primary' : 'secondary'}
                size="sm"
                loading={pending === u.id}
                onClick={() => toggle(u)}
              >
                {u.status === 'suspended' ? '恢复' : '停用'}
              </Button>
            )}
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
