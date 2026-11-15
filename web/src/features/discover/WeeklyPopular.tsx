// SPDX-License-Identifier: AGPL-3.0-or-later
import { FeedView } from '../feed'
import { useWeeklyQuery } from './discover.queries'

/**
 * 本周热门：只排帖子、不排人。
 * 按用户排名就是排行榜，PRD `FR-ACH-04` 明确禁止；这里只有内容，没有名次标签，
 * 也不显示「第几名」或「热度值」——数字只用来排序，不给用户看。
 */
export function WeeklyPopular() {
  const query = useWeeklyQuery()

  return (
    <section aria-labelledby="weekly-heading">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="weekly-heading" className="text-base font-semibold text-ink">
          本周热门
        </h2>
        <span className="text-xs text-faint">按本周的赞与评论</span>
      </div>

      <FeedView
        items={query.data?.items ?? []}
        isPending={query.isPending}
        error={query.isError ? query.error : null}
        onRetry={() => void query.refetch()}
        empty={
          <div className="sp-card px-5 py-8 text-center">
            <p className="text-sm text-muted">
              本周还没有产生互动的帖子。有人点赞或评论后，这里会自动出现。
            </p>
          </div>
        }
      />
    </section>
  )
}
