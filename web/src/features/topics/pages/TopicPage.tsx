import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { FeedTab } from '../../../types/api'
import { EmptyState, ErrorState } from '../../../components/feedback/States'
import { mergeFeedPages } from '../../../lib/pagination'
import {
  FeedSkeleton,
  FeedTabs,
  FeedView,
  useFeedQuery,
  useFeedSentinel,
} from '../../feed'
import { useScrollRestore } from '../../../hooks/useScrollRestore'
import { useTopicsQuery } from '../queries'

/**
 * 话题详情：话题说明 + 该话题下的帖子流。
 * 筛选在服务端完成（`/api/posts?topic=slug`），因此可见性与排序规则与首页完全一致，
 * 不会出现「话题页能看到、首页看不到」的口径分叉。
 */
export function TopicPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [tab, setTab] = useState<FeedTab>('latest')
  const navigate = useNavigate()

  const topicsQuery = useTopicsQuery()
  const query = useFeedQuery(tab, slug)
  const sentinelRef = useFeedSentinel(query.hasNextPage, query.isFetchingNextPage, () => {
    void query.fetchNextPage()
  })
  const items = mergeFeedPages(query.data?.pages ?? [])
  useScrollRestore(`topic:${slug}:${tab}`, query.isSuccess)

  const topic = topicsQuery.data?.find((item) => item.slug === slug)
  const unknownTopic = topicsQuery.isSuccess && topic === undefined

  if (unknownTopic) {
    return (
      <EmptyState
        title="话题不存在"
        description="该分类不存在或已归档，可以回到话题列表重新选择。"
        actionLabel="查看全部话题"
        onAction={() => navigate('/topics')}
      />
    )
  }

  return (
    <section aria-labelledby="topic-heading">
      <Link
        to="/topics"
        className="sp-transition mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> 全部话题
      </Link>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 id="topic-heading" className="text-xl font-semibold text-ink">
            {topic?.nameZh ?? slug}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {topic?.description ?? '正在读取话题信息…'}
          </p>
        </div>
        <FeedTabs value={tab} onChange={setTab} />
      </div>

      <div role="feed" aria-busy={query.isPending || undefined}>
        <FeedView
          items={items}
          isPending={query.isPending}
          error={query.isError ? query.error : null}
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState
              title="这个话题还没有内容"
              description="成为第一个在这里发帖的人，或者换一个话题看看。"
              actionLabel="在这里发帖"
              onAction={() => navigate('/posts/new')}
            />
          }
        />

        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
        {query.isFetchingNextPage && <FeedSkeleton count={1} />}
      </div>
    </section>
  )
}
