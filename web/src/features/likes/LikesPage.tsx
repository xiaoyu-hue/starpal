// SPDX-License-Identifier: AGPL-3.0-or-later
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/feedback/States'
import { useScrollRestore } from '../../hooks/useScrollRestore'
import { mergeFeedPages } from '../../lib/pagination'
import { FeedSkeleton, FeedView, useFeedSentinel } from '../feed'
import { useLikesQuery } from './likes.queries'

/** 我的点赞：只有本人可见（路由层 RequireAuth + 服务端按登录者过滤）。 */
export function LikesPage() {
  const navigate = useNavigate()
  const query = useLikesQuery()
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query
  const sentinelRef = useFeedSentinel(hasNextPage, isFetchingNextPage, () => {
    void fetchNextPage()
  })
  const items = mergeFeedPages(query.data?.pages ?? [])
  useScrollRestore('likes', query.isSuccess)

  return (
    <section aria-labelledby="likes-heading">
      <div className="mb-4">
        <h1 id="likes-heading" className="text-xl font-semibold text-ink">
          我的点赞
        </h1>
        <p className="mt-1 text-sm text-muted">点过赞的帖子，只有你自己能看到。</p>
      </div>

      <div role="feed" aria-busy={query.isPending || undefined}>
        <FeedView
          items={items}
          isPending={query.isPending}
          error={query.isError ? query.error : null}
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState
              title="还没有点赞"
              description="在帖子里点一下赞，之后就能从这里找回来。"
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
