// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Badge } from '../../components/ui/Primitives'
import { ErrorState } from '../../components/feedback/States'
import { useTopicsQuery } from '../topics'
import { WeeklyPopular } from './WeeklyPopular'

/**
 * 发现页。
 *
 * 内容是两块：本周热门（只排帖子）与话题入口。
 * 话题在这里不是重复——移动端 `MOBILE_TAB_KEYS` 只有四项（首页 / 发现 / 私信 / 我的），
 * `nav-items.ts` 明确写着「话题并入发现」。此前本页是占位页，导致**手机端根本到不了话题**，
 * 这个页面把那条路补上；桌面端另有 `/topics` 全量目录，这里只做入口不重复铺满。
 *
 * 刻意不做：推荐算法、"猜你喜欢"、热度分值展示。热门只按本周赞与评论排序，
 * 且只排内容不排人（`FR-ACH-04`）。
 */
export function DiscoverPage() {
  const topics = useTopicsQuery()

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-ink">发现</h1>
        <p className="mt-1 text-sm text-muted">
          本周被点赞和评论最多的帖子，以及可以钻进去的话题。
        </p>
      </header>

      <WeeklyPopular />
      {/*
        话题列表只在没有左侧栏的窄屏出现（`lg` 以下）。`lg` 及以上左栏已经常驻「话题分类」，
        正文再铺一遍就是同一屏里出现两遍同样的十个话题。这里不是「隐藏功能」，
        而是同一职责交给更合适的位置：宽屏看左栏与顶栏，窄屏看本页。
      */}
      <div className="lg:hidden">
        <TopicsSection
          isPending={topics.isPending}
          isError={topics.isError}
          onRetry={() => void topics.refetch()}
          topics={topics.data ?? []}
        />
      </div>
    </div>
  )
}

/** 话题入口：名称、英文名与真实篇数，不伪造热度或趋势。 */
function TopicsSection({
  isPending,
  isError,
  onRetry,
  topics,
}: {
  isPending: boolean
  isError: boolean
  onRetry: () => void
  topics: { id: number; slug: string; nameZh: string; nameEn: string; postCount: number }[]
}) {
  return (
    <section aria-labelledby="discover-topics-heading">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="discover-topics-heading" className="text-base font-semibold text-ink">
          话题
        </h2>
        <Link
          to="/topics"
          className="sp-transition inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          全部话题 <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>

      {isPending && (
        <div className="grid gap-2 sm:grid-cols-2" role="status" aria-live="polite">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="sp-skeleton h-16 w-full rounded-md" />
          ))}
        </div>
      )}

      {isError && <ErrorState title="话题加载失败" onRetry={onRetry} />}

      {!isPending && !isError && topics.length === 0 && (
        <div className="sp-card px-5 py-8 text-center">
          <p className="text-sm text-muted">还没有话题，通常是数据迁移尚未执行。</p>
        </div>
      )}

      {!isPending && !isError && topics.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link
                to={`/topics/${topic.slug}`}
                className="sp-transition sp-card flex items-center justify-between gap-3 px-4 py-3 hover:border-line-strong"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{topic.nameZh}</span>
                  <span className="block truncate text-xs text-faint">{topic.nameEn}</span>
                </span>
                <Badge variant="neutral">{topic.postCount} 篇</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
