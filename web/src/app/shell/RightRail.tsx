// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link } from 'react-router-dom'
import { Megaphone, Sparkles, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, Card } from '../../components/ui/Primitives'
import { useTopicsQuery } from '../../features/topics'
import { useFeedQuery } from '../../features/feed'
import { useAnnouncementsQuery } from '../../features/_static/meta.queries'
import { ANNOUNCEMENT_KIND_META } from '../../features/_static/announcement-kinds'

function RailCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon} {title}
      </h2>
      {children}
    </Card>
  )
}

/** 推荐面板最多列出几条：右栏是入口，不是第二个信息流。 */
const PICK_LIMIT = 3

const PLACEHOLDER = 'rounded-sm border border-line bg-subtle px-3 py-4 text-center text-xs text-muted'

/**
 * 右栏：热门话题 / 公告 / 推荐。
 * 「热门」以真实帖数排序，而不是编造热度分值——没有内容时如实显示空态。
 *
 * 推荐面板此前只有一句「推荐位依赖话题选择，将在后续里程碑接入」。那句话是错的：
 * 推荐早已实现，`FR-FEED-01` 的 recommended 信息流用的是确定性加权排序
 * （话题亲和度 + 时间衰减 + 热度分），不涉及机器学习或行为画像（`ADR-008` 否掉的是后者）。
 * 数据现成，这里就直接读推荐流的前三条，与首页推荐 Tab 共用同一份缓存，不额外发请求。
 */
export function RightRail() {
  const topicsQuery = useTopicsQuery()
  const announcementsQuery = useAnnouncementsQuery()
  const recommendedQuery = useFeedQuery('recommended')
  const latest = announcementsQuery.data?.items[0]
  // 后端新增类型时老代码不该整块崩掉：取不到就退回「新增功能」，宁可标签不准也不要白屏。
  const latestKind = latest
    ? (ANNOUNCEMENT_KIND_META[latest.kind] ?? ANNOUNCEMENT_KIND_META.feature)
    : null
  const hot = [...(topicsQuery.data ?? [])]
    .filter((topic) => topic.postCount > 0)
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 5)
  // 只取首屏前三条：推荐面板是入口，不是第二个信息流。
  const picks = (recommendedQuery.data?.pages[0]?.items ?? []).slice(0, PICK_LIMIT)

  return (
    <aside aria-label="热门话题与公告" className="space-y-4">
      <RailCard title="热门话题" icon={<TrendingUp size={15} />}>
        {topicsQuery.isPending ? (
          <div className="space-y-2" role="status" aria-label="正在加载热门话题">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="sp-skeleton h-4 w-full rounded-sm" />
            ))}
          </div>
        ) : hot.length === 0 ? (
          <p className={PLACEHOLDER}>还没有内容，热门话题暂时为空</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {hot.map((topic, index) => (
              <li key={topic.id}>
                <Link
                  to={`/topics/${topic.slug}`}
                  className="sp-transition flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-muted hover:bg-subtle hover:text-ink"
                >
                  <span className="truncate">
                    <span className="mr-1.5 text-xs text-faint">{index + 1}</span>
                    {topic.nameZh}
                  </span>
                  <span className="shrink-0 text-xs text-faint">{topic.postCount} 篇</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </RailCard>

      {/* 公告文案改由 /api/meta/announcements 下发：原先硬编码在此，与公告页会各说一套。 */}
      <RailCard title="社区公告" icon={<Megaphone size={15} />}>
        {announcementsQuery.isPending ? (
          <div className="space-y-2" role="status" aria-label="正在加载公告">
            <div className="sp-skeleton h-4 w-full rounded-sm" />
            <div className="sp-skeleton h-4 w-2/3 rounded-sm" />
          </div>
        ) : !latest ? (
          <p className={PLACEHOLDER}>暂无公告</p>
        ) : (
          <>
            {latestKind && (
              <span className="mb-1 inline-flex">
                <Badge variant={latestKind.variant}>{latestKind.label}</Badge>
              </span>
            )}
            <p className="text-sm font-medium text-ink">{latest.title}</p>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">{latest.summary}</p>
            <Link
              to="/announcements"
              className="sp-transition mt-2 inline-block text-xs text-accent hover:underline"
            >
              查看全部公告 →
            </Link>
          </>
        )}
      </RailCard>

      <RailCard title="为你推荐" icon={<Sparkles size={15} />}>
        {recommendedQuery.isPending ? (
          <div className="space-y-2" role="status" aria-label="正在加载推荐">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="sp-skeleton h-4 w-full rounded-sm" />
            ))}
          </div>
        ) : picks.length === 0 ? (
          <p className={PLACEHOLDER}>
            {recommendedQuery.isError ? '推荐加载失败，稍后再试' : '暂时没有可推荐的帖子'}
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {picks.map((post) => (
                <li key={post.id}>
                  <Link
                    to={`/posts/${post.id}`}
                    className="sp-transition block rounded-sm text-sm leading-snug text-ink hover:text-accent"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-faint">
                    {post.topic.nameZh} · {post.likeCount} 赞
                  </p>
                </li>
              ))}
            </ul>
            <Link
              to="/"
              className="sp-transition mt-3 inline-block text-xs text-accent hover:underline"
            >
              看更多推荐 →
            </Link>
          </>
        )}
      </RailCard>
    </aside>
  )
}
