// SPDX-License-Identifier: AGPL-3.0-or-later
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/feedback/States'
import { FeedSkeleton } from '../feed'
import { ReportButton } from './ReportButton'
import { ReportList, ReportRow, ReportRowItem } from './ReportList'
import { useMyReportsQuery } from './reports.queries'

/**
 * 我的提交：举报与申诉的处理状态、运营者答复。
 * 只有本人可见（路由 RequireAuth + 服务端按登录者过滤）；列表按提交时间倒序。
 * 申诉入口直接放在本页，省去为「对处置有异议」再建一条导航。
 */
export function MyReportsPage() {
  const navigate = useNavigate()
  const query = useMyReportsQuery()
  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section aria-labelledby="my-reports-heading" className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="my-reports-heading" className="text-xl font-semibold text-ink">
            我的提交
          </h1>
          <p className="mt-1 text-sm text-muted">
            举报与申诉只有你和运营者能看到，处理状态和答复会显示在这里。
          </p>
        </div>
        <ReportButton kind="appeal" variant="secondary" size="sm" label="提交申诉" />
      </div>

      {query.isPending ? (
        <div className="space-y-3" role="status" aria-live="polite">
          <FeedSkeleton count={2} />
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="还没有提交"
          description="在帖子或评论里发现问题时可以举报；认为处理有误，也可以在这里提交申诉。"
          actionLabel="回首页看看"
          onAction={() => void navigate('/')}
        />
      ) : (
        <>
          <ReportList>
            {items.map((item) => (
              <ReportRowItem key={item.id}>
                <ReportRow item={item} />
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
