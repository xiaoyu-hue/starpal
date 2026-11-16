// SPDX-License-Identifier: AGPL-3.0-or-later
import { Card } from '../../components/ui/Primitives'
import { FeedSkeleton } from '../feed'
import { ErrorState } from '../../components/feedback/States'
import { useAdminStatsQuery } from './admin.queries'

const ITEMS = [
  { key: 'userCount', label: '成员数', note: '排除已注销账号' },
  { key: 'postCount', label: '帖子数', note: '已发布、作者未停用、话题未归档' },
  { key: 'commentCount', label: '评论数', note: '已发布且未移除' },
  { key: 'pendingReportCount', label: '待处理举报', note: '含待复核与复核中' },
] as const

export function AdminStatsPage() {
  const query = useAdminStatsQuery()
  const stats = query.data

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">数字实时从数据库聚合，口径与前台可见范围保持一致。</p>
      {query.isPending ? (
        <FeedSkeleton count={2} />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : stats ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {ITEMS.map((item) => (
            <Card key={item.key} className="p-5">
              <div className="text-3xl font-semibold text-ink">{stats[item.key]}</div>
              <div className="mt-2 text-sm font-medium text-muted">{item.label}</div>
              <div className="mt-1 text-xs text-faint">{item.note}</div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
