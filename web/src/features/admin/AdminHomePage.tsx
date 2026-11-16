// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Primitives'
import { FeedSkeleton } from '../feed'
import { ErrorState } from '../../components/feedback/States'
import { useAdminStatsQuery } from './admin.queries'

/** 统计概览：四个数字，纯文本卡片，不引图表库。 */
export function AdminHomePage() {
  const query = useAdminStatsQuery()
  const stats = query.data

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        社区此刻的概览。数字与前台可见范围一致：停用作者的帖子、已归档话题下的帖子不计入。
      </p>
      {query.isPending ? (
        <FeedSkeleton count={1} />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="成员" value={stats.userCount} to="/admin/users" />
          <StatCard label="帖子" value={stats.postCount} to="/admin/posts" />
          <StatCard label="评论" value={stats.commentCount} to="/admin/comments" />
          <StatCard label="待处理举报" value={stats.pendingReportCount} to="/admin/reports" />
        </div>
      ) : null}
    </div>
  )
}

function StatCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="sp-transition block rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--sp-accent-soft)]">
      <Card className="h-full p-4 hover:border-line-strong">
        <div className="text-2xl font-semibold text-ink">{value}</div>
        <div className="mt-1 text-xs text-muted">{label}</div>
      </Card>
    </Link>
  )
}
