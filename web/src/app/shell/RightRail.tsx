import { Link } from 'react-router-dom'
import { Megaphone, TrendingUp, Bookmark } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../../components/ui/Primitives'
import { useTopicsQuery } from '../../features/topics'
import { useAnnouncementsQuery } from '../../features/_static/meta.queries'

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

const PLACEHOLDER = 'rounded-sm border border-line bg-subtle px-3 py-4 text-center text-xs text-muted'

/**
 * 右栏：热门话题 / 公告 / 推荐。
 * 「热门」以真实帖数排序，而不是编造热度分值——没有内容时如实显示空态。
 * 推荐位依赖行为画像，属后续里程碑，此处不假装已有推荐结果。
 */
export function RightRail() {
  const topicsQuery = useTopicsQuery()
  const announcementsQuery = useAnnouncementsQuery()
  const latest = announcementsQuery.data?.items[0]
  const hot = [...(topicsQuery.data ?? [])]
    .filter((topic) => topic.postCount > 0)
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 5)

  return (
    <aside aria-label="推荐与公告" className="space-y-4">
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
            <p className="text-sm font-medium text-ink">{latest.title}</p>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">{latest.body}</p>
            <Link
              to="/announcements"
              className="sp-transition mt-2 inline-block text-xs text-accent hover:underline"
            >
              查看全部公告 →
            </Link>
          </>
        )}
      </RailCard>

      <RailCard title="为你推荐" icon={<Bookmark size={15} />}>
        <p className={PLACEHOLDER}>推荐位依赖话题选择，将在后续里程碑接入</p>
      </RailCard>
    </aside>
  )
}
