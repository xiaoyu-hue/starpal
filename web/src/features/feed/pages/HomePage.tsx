// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { FeedTab } from '../../../types/api'
import { EmptyState } from '../../../components/feedback/States'
import { mergeFeedPages } from '../../../lib/pagination'
import { useScrollRestore } from '../../../hooks/useScrollRestore'
import { FeedTabs } from '../components/FeedTabs'
import { FeedSkeleton } from '../components/FeedSkeleton'
import { FeedView } from '../components/FeedView'
import { useFeedSentinel } from '../hooks/useFeedSentinel'
import { useFeedQuery } from '../queries'

/** 首页信息流：三态由真实请求驱动，键盘导航覆盖条目。 */
export function HomePage() {
  const [tab, setTab] = useState<FeedTab>('recommended')
  const query = useFeedQuery(tab)
  const navigate = useNavigate()
  // 角色守卫把非管理员弹回首页时会带一句 notice（guards.tsx），这里负责把它显示出来。
  // 不接这句话，用户只会看到自己莫名其妙被扔回首页，不知道发生了什么。
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query
  const sentinelRef = useFeedSentinel(hasNextPage, isFetchingNextPage, () => {
    void fetchNextPage()
  })

  const items = mergeFeedPages(query.data?.pages ?? [])
  // 从详情返回时回到离开时的位置；Tab 作为键的一部分，切换排序不串位置。
  useScrollRestore(`home:${tab}`, query.isSuccess)

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

      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-sm border border-line bg-subtle px-4 py-3 text-sm text-ink"
        >
          {notice}
        </p>
      ) : null}

      <div role="feed" aria-busy={query.isPending || undefined} onKeyDown={handleKeyDown}>
        <FeedView
          items={items}
          isPending={query.isPending}
          error={query.isError ? query.error : null}
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState
              description="当前社区还没有真实内容。写下第一篇，或者先挑一个话题开始。"
              actionLabel="写下第一篇"
              onAction={() => void navigate('/posts/new')}
            />
          }
        />

        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
        {isFetchingNextPage && <FeedSkeleton count={1} />}
      </div>
    </section>
  )
}
