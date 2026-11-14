import { Link, useNavigate } from 'react-router-dom'
import { Layers3 } from 'lucide-react'
import { Badge } from '../../../components/ui/Primitives'
import { EmptyState, ErrorState } from '../../../components/feedback/States'
import { useTopicsQuery } from '../queries'

/**
 * 话题目录页。
 * 话题由数据库内置数据提供（迁移 003 写入 9 个），此处不伪造热度或趋势数据，
 * 只展示名称、说明与「当前有多少篇可见内容」这一真实计数。
 */
export function TopicsPage() {
  const navigate = useNavigate()
  const query = useTopicsQuery()

  if (query.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" role="status" aria-live="polite">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="sp-skeleton h-28 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (query.isError) {
    return <ErrorState title="话题加载失败" onRetry={() => void query.refetch()} />
  }

  const topics = query.data

  if (topics.length === 0) {
    return (
      <EmptyState
        title="还没有话题"
        description="话题目录为空，通常是数据迁移尚未执行。"
        actionLabel="返回首页"
        onAction={() => navigate('/')}
      />
    )
  }

  const total = topics.reduce((sum, topic) => sum + topic.postCount, 0)

  return (
    <section aria-labelledby="topics-heading">
      <div className="mb-4">
        <h1 id="topics-heading" className="flex items-center gap-2 text-xl font-semibold text-ink">
          <Layers3 size={19} /> 话题
        </h1>
        <p className="mt-1 text-sm text-muted">
          {topics.length} 个分类，共 {total} 篇内容。挑一个感兴趣的分类进去看看。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            to={`/topics/${topic.slug}`}
            className="sp-transition sp-card block p-5 hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-ink">{topic.nameZh}</h2>
                <p className="mt-0.5 truncate text-xs text-faint">{topic.nameEn}</p>
              </div>
              <Badge variant="neutral">{topic.postCount} 篇</Badge>
            </div>
            {topic.description && (
              <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted">
                {topic.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
