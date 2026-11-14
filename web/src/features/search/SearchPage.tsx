// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { buttonClass } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { mergeFeedPages } from '../../lib/pagination'
import { FeedSkeleton, FeedView, useFeedSentinel } from '../feed'
import type { SearchType } from './search.api'
import { useSearchQuery } from './search.queries'

const TYPE_OPTIONS: { value: SearchType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'post', label: '帖子' },
  { value: 'topic', label: '话题' },
]

const CHIP_BASE = 'sp-transition h-8 rounded-full border px-3 text-sm'
const CHIP_ACTIVE = 'border-accent bg-[var(--sp-accent-soft)] text-accent'
const CHIP_IDLE = 'border-line text-muted hover:border-line-strong hover:text-ink'

/**
 * 搜索页：关键词来自 URL 的 `q`（可分享 / 前进后退），范围 `type` 为本地状态。
 * 结果复用信息流卡片（FeedView），与服务端同一可见性口径，前端不再二次过滤。
 */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()

  const [input, setInput] = useState(params.get('q') ?? '')
  const [type, setType] = useState<SearchType>('all')

  // 浏览器前进/后退改变 q 时，把输入框同步回 URL 的值。
  useEffect(() => {
    setInput(params.get('q') ?? '')
  }, [params])

  const query = useSearchQuery(q, type)
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query
  const sentinelRef = useFeedSentinel(hasNextPage, isFetchingNextPage, () => {
    void fetchNextPage()
  })
  const items = useMemo(() => mergeFeedPages(query.data?.pages ?? []), [query.data])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = input.trim()
    setParams(next ? { q: next } : {})
  }

  return (
    <section aria-labelledby="search-heading">
      <div className="mb-4">
        <h1 id="search-heading" className="text-xl font-semibold text-ink">
          搜索
        </h1>
        <p className="mt-1 text-sm text-muted">搜索帖子标题、正文，或话题名称。</p>
      </div>

      <form onSubmit={onSubmit} role="search" className="mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              type="search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入关键词…"
              aria-label="搜索关键词"
              maxLength={100}
              autoFocus
              className={cn(
                'sp-transition h-10 w-full rounded-md bg-surface pl-9 pr-3 text-ink',
                'border border-line placeholder:text-faint',
                'focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--sp-accent-soft)]',
              )}
            />
          </div>
          <button type="submit" className={buttonClass('primary', 'md')}>
            搜索
          </button>
        </div>

        <div className="mt-2 flex gap-1.5" role="group" aria-label="搜索范围">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={type === option.value}
              onClick={() => setType(option.value)}
              className={cn(CHIP_BASE, type === option.value ? CHIP_ACTIVE : CHIP_IDLE)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </form>

      {q === '' ? (
        <div className="sp-card px-6 py-10 text-center">
          <p className="text-sm text-muted">输入关键词，搜索帖子标题、正文或话题名称。</p>
        </div>
      ) : (
        <div role="feed" aria-busy={query.isPending || undefined}>
          <FeedView
            items={items}
            isPending={query.isPending}
            error={query.isError ? query.error : null}
            onRetry={() => void query.refetch()}
            empty={
              <div className="sp-card px-6 py-10 text-center">
                <p className="text-base font-semibold text-ink">没有找到相关帖子</p>
                <p className="mt-1.5 text-sm text-muted">
                  没有与「{q}」匹配的内容，换个关键词试试。
                </p>
              </div>
            }
          />
          <div ref={sentinelRef} aria-hidden="true" className="h-1" />
          {isFetchingNextPage && <FeedSkeleton count={1} />}
        </div>
      )}
    </section>
  )
}
