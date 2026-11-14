// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card } from '../../components/ui/Primitives'
import type { ReportItem, ReportQueueItem } from '../../types/reports'
import { REASON_LABEL, STATUS_LABEL } from '../../types/reports'

function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

/** 状态徽章：待处理用强调色，已处理/已驳回为中性，不引入硬编码颜色。 */
function StatusBadge({ status }: { status: ReportItem['status'] }) {
  return (
    <Badge variant={status === 'pending' ? 'accent' : 'neutral'}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

/** 目标描述：帖子可跳转，评论只显示编号（评论列表按帖子组织，无独立路由）。 */
function TargetLabel({ item }: { item: ReportItem }) {
  if (item.kind === 'appeal' || item.targetType === null || item.targetId === null) {
    return <span className="text-muted">申诉（不指向具体内容）</span>
  }
  if (item.targetType === 'post') {
    return (
      <Link to={`/posts/${item.targetId}`} className="text-accent hover:underline">
        帖子 #{item.targetId}
      </Link>
    )
  }
  return <span className="text-muted">评论 #{item.targetId}</span>
}

type RowProps = {
  item: ReportItem
  /** 管理队列额外展示提交人。 */
  reporter?: ReportQueueItem['reporter']
  /** 管理队列的操作区（决策按钮）。 */
  actions?: ReactNode
}

/** 单条提交：本人列表与管理员队列共用，避免两处各写一套状态文案。 */
export function ReportRow({ item, reporter, actions }: RowProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          <span className="text-sm font-medium text-ink">
            {item.kind === 'appeal' ? '申诉' : `举报 · ${REASON_LABEL[item.reason] ?? item.reason}`}
          </span>
          {reporter && (
            <span className="text-xs text-faint">来自 {reporter.displayName}（@{reporter.username}）</span>
          )}
        </div>
        <span className="text-xs text-faint">{formatTime(item.createdAt)}</span>
      </div>

      <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
        {item.detail}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <TargetLabel item={item} />
        {item.resolvedAt && <span>答复于 {formatTime(item.resolvedAt)}</span>}
      </div>

      {item.resolutionNote && (
        <div className="mt-3 rounded-md border border-line bg-subtle px-3 py-2.5">
          <p className="text-xs font-medium text-muted">运营者答复</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">
            {item.resolutionNote}
          </p>
        </div>
      )}

      {actions && <div className="mt-3 flex flex-wrap justify-end gap-2">{actions}</div>}
    </Card>
  )
}

/** 列表容器：统一间距与语义，避免两个页面重复布局代码。 */
export function ReportList({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-3" aria-label="提交列表">
      {children}
    </ul>
  )
}

export function ReportRowItem({ children }: { children: ReactNode }) {
  return <li>{children}</li>
}
