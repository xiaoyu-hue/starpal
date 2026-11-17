// SPDX-License-Identifier: AGPL-3.0-or-later
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/feedback/States'
import { useScrollRestore } from '../../hooks/useScrollRestore'
import { mergeFeedPages } from '../../lib/pagination'
import { feedRole } from '../../lib/feed-a11y'
import { FeedSkeleton, FeedView, useFeedSentinel } from '../feed'
import { useBookmarksQuery } from './bookmarks.queries'

/** 我的收藏：只有本人可见（路由层 RequireAuth + 服务端按登录者过滤）。 */
export function BookmarksPage() {
  const navigate = useNavigate()
  const query = useBookmarksQuery()
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query
  const sentinelRef = useFeedSentinel(hasNextPage, isFetchingNextPage, () => {
    void fetchNextPage()
  })
  const items = mergeFeedPages(query.data?.pages ?? [])
  useScrollRestore('bookmarks', query.isSuccess)

  return (
    <section aria-labelledby="bookmarks-heading">
      <div className="mb-4">
        <h1 id="bookmarks-heading" className="text-xl font-semibold text-ink">
          我的收藏
        </h1>
        <p className="mt-1 text-sm text-muted">收藏了什么，只有你自己能看到。</p>
      </div>

      <div
        role={feedRole(query.isPending, query.isError, items.length)}
        aria-busy={query.isPending || undefined}
      >
        <FeedView
          items={items}
          isPending={query.isPending}
          error={query.isError ? query.error : null}
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState
              title="还没有收藏"
              description="在帖子里点一下收藏，之后就能从这里找回来。"
              actionLabel="回首页看看"
              onAction={() => void navigate('/')}
            />
          }
        />

        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
        {isFetchingNextPage && <FeedSkeleton count={1} />}
      </div>
    </section>
  )
}
