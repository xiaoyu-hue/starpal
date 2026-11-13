import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FeedTab } from '../../../types/api'
import { EmptyState, ErrorState } from '../../../components/feedback/States'
import { ApiError } from '../../../lib/api-client'
import { Card } from '../../../components/ui/Primitives'
import { mergeFeedPages } from '../../../lib/pagination'
import { FeedTabs } from '../components/FeedTabs'
import { FeedSkeleton } from '../components/FeedSkeleton'
import { PostCard } from '../components/PostCard'
import { useFeedQuery } from '../queries'

/** 首页信息流：三态均由真实请求驱动，键盘导航覆盖条目。 */
export function HomePage() {
  const [tab, setTab] = useState<FeedTab>('recommended')
  const query = useFeedQuery(tab)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const pages = query.data?.pages ?? []
  const items = mergeFeedPages(pages)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) return
    const articles = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="article"]'),
    )
    if (articles.length === 0) return
    const current = articles.findIndex((node) => node === document.activeElement)
    let next = current
    if (event.key === 'PageDown') next = Math.min(current + 1, articles.length - 1)
    if (event.key === 'PageUp') next = Math.max(current - 1, 0)
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = articles.length - 1
    if (next < 0) next = 0
    event.preventDefault()
    articles[next]?.focus()
  }

  return (
    <section aria-labelledby="feed-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="feed-heading" className="text-xl font-semibold text-ink">
            信息流
          </h1>
          <p className="mt-1 text-sm text-muted">让兴趣相遇，让热爱聚集。</p>
        </div>
        <FeedTabs value={tab} onChange={setTab} />
      </div>

      <div role="feed" aria-busy={query.isPending || undefined} onKeyDown={handleKeyDown}>
        {query.isPending && <FeedSkeleton />}

        {query.isError && !query.isPending && query.error instanceof ApiError && query.error.code === 'OFFLINE_PREVIEW' && (
          <Card className="p-6 text-center">
            <h3 className="text-base font-semibold text-ink">离线预览模式</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              当前为不连接后端的设计预览，不展示任何内容数据。运行应用后，信息流会从服务端读取真实数据；
              无内容时显示引导式空态。
            </p>
          </Card>
        )}

        {query.isError && !query.isPending && !(query.error instanceof ApiError && query.error.code === 'OFFLINE_PREVIEW') && (
          <ErrorState
            description={query.error.message}
            onRetry={() => void query.refetch()}
          />
        )}

        {!query.isPending && !query.isError && items.length === 0 && (
          <EmptyState
            description="当前社区还没有真实内容。发布功能将在 M3 里程碑交付，届时可从这里写下第一篇。"
            actionLabel="查看发布入口"
            onAction={() => void navigate('/posts/new')}
          />
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((post, index) => (
              <PostCard key={post.id} post={post} position={index + 1} total={items.length} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
        {isFetchingNextPage && <FeedSkeleton count={1} />}
      </div>
    </section>
  )
}
