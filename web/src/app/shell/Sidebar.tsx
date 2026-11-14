import { Link, NavLink } from 'react-router-dom'
import { Layers3 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Card } from '../../components/ui/Primitives'
import { useTopicsQuery } from '../../features/topics'
import { ABOUT_LINKS, DESKTOP_KEYS, DESTINATIONS } from './nav-items'

/** 侧栏导航项：左对齐带图标，与标准居中按钮视觉意图不同，故单独定义。 */
function navItemClass(isActive: boolean): string {
  return cn(
    'sp-transition inline-flex h-10 w-full items-center justify-start gap-2 rounded-md px-4 text-sm font-medium',
    'hover:bg-subtle',
    isActive ? 'bg-subtle text-ink' : 'text-muted hover:text-ink',
  )
}

/** 侧栏最多列出的话题数：超过后交给「全部话题」页，避免长列表淹没导航。 */
const SIDEBAR_TOPIC_LIMIT = 6

/**
 * 左栏：导航目的地 + 话题分类。
 * 话题取自真实目录（`/api/topics`），不再维护一份会与数据库漂移的硬编码标签表；
 * 数量与名称以服务端为准，侧栏只决定展示前几个。
 */
export function Sidebar() {
  const topicsQuery = useTopicsQuery()
  const topics = (topicsQuery.data ?? []).slice(0, SIDEBAR_TOPIC_LIMIT)

  return (
    <aside aria-label="侧边导航" className="space-y-4">
      <Card className="p-3">
        <nav aria-label="目的地" className="flex flex-col gap-0.5">
          {DESKTOP_KEYS.map((key) => {
            const item = DESTINATIONS[key]!
            const Icon = item.icon
            return (
              <NavLink
                key={key}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <Icon size={17} /> {item.label}
              </NavLink>
            )
          })}
        </nav>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Layers3 size={15} /> 话题分类
        </h2>

        {topicsQuery.isPending ? (
          <div className="space-y-2" role="status" aria-label="正在加载话题">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="sp-skeleton h-4 w-20 rounded-sm" />
            ))}
          </div>
        ) : topicsQuery.isError ? (
          <p className="text-xs leading-relaxed text-faint">话题暂时无法加载，稍后刷新重试。</p>
        ) : (
          <ul className="space-y-0.5 text-sm">
            {topics.map((topic) => (
              <li key={topic.id}>
                <NavLink
                  to={`/topics/${topic.slug}`}
                  className="sp-transition block rounded-sm px-2 py-1.5 text-muted hover:bg-subtle hover:text-ink"
                >
                  {topic.nameZh}
                </NavLink>
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/topics"
          className="sp-transition mt-3 block border-t border-line pt-3 text-xs text-muted hover:text-ink"
        >
          全部话题 →
        </Link>
      </Card>

      {/* 说明页入口：原先是不可点击的静态文案卡片，写着「社区准则」却点不进去。 */}
      <Card className="p-3">
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink">关于星聚</h2>
        <ul className="space-y-0.5 text-sm">
          {ABOUT_LINKS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.key}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'sp-transition flex items-center gap-2 rounded-sm px-2 py-1.5',
                      isActive ? 'bg-subtle text-ink' : 'text-muted hover:bg-subtle hover:text-ink',
                    )
                  }
                >
                  <Icon size={15} /> {item.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 border-t border-line px-2 pt-3 text-xs leading-relaxed text-faint">
          尊重每一位成员，围绕兴趣与知识展开讨论。
        </p>
      </Card>
    </aside>
  )
}
