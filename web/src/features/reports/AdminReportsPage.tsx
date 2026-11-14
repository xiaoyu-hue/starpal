// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/feedback/States'
import { FeedSkeleton } from '../feed'
import { DecisionDialog } from './DecisionDialog'
import { ReportList, ReportRow, ReportRowItem } from './ReportList'
import { useReportQueueQuery } from './reports.queries'
import type { ReportStatus } from '../../types/reports'

const FILTERS: { value: ReportStatus | null; label: string }[] = [
  { value: 'pending', label: '待处理' },
  { value: 'resolved', label: '已处理' },
  { value: 'dismissed', label: '已驳回' },
  { value: null, label: '全部' },
]

/**
 * 举报 / 申诉管理队列：仅管理员可达（路由 RequireRole + 服务端双守卫）。
 * 只提供状态标记与答复，不做内容处置；提交人身份仅在此对运营者可见。
 */
export function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus | null>('pending')
  const query = useReportQueueQuery(status)
  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section aria-labelledby="admin-reports-heading" className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 id="admin-reports-heading" className="text-xl font-semibold text-ink">
          举报与申诉
        </h1>
        <p className="mt-1 text-sm text-muted">
          按提交时间倒序。处理只会标记状态并答复提交人，不会移除内容或停用账号。
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="按状态筛选">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={status === f.value}
            onClick={() => setStatus(f.value)}
            className={
              status === f.value
                ? 'sp-transition rounded-sm border border-accent bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent'
                : 'sp-transition rounded-sm border border-line bg-surface px-3 py-1.5 text-sm text-muted hover:border-line-strong hover:text-ink'
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <div className="space-y-3" role="status" aria-live="polite">
          <FeedSkeleton count={2} />
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="这里没有提交"
          description="当前筛选下没有举报或申诉。切换上方状态可以看看其它条目。"
          actionLabel="查看全部"
          onAction={() => setStatus(null)}
        />
      ) : (
        <>
          <ReportList>
            {items.map((item) => (
              <ReportRowItem key={item.id}>
                <ReportRow
                  item={item}
                  reporter={item.reporter}
                  actions={item.status === 'pending' ? <DecisionDialog reportId={item.id} /> : undefined}
                />
              </ReportRowItem>
            ))}
          </ReportList>
          {query.hasNextPage && (
            <div className="mt-4 text-center">
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
        </>
      )}
    </section>
  )
}
