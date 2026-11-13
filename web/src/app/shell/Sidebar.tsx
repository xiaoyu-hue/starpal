import { NavLink } from 'react-router-dom'
import { BookOpen, Flame, Layers3, Sparkles } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Card } from '../../components/ui/Primitives'
import { DESKTOP_KEYS, DESTINATIONS } from './nav-items'

/** 侧栏导航项：左对齐带图标，与标准居中按钮视觉意图不同，故单独定义。 */
function navItemClass(isActive: boolean): string {
  return cn(
    'sp-transition inline-flex h-10 w-full items-center justify-start gap-2 rounded-md px-4 text-sm font-medium',
    'hover:bg-subtle',
    isActive ? 'bg-subtle text-ink' : 'text-muted hover:text-ink',
  )
}

const TOPIC_LINKS = [
  { label: '技术与数字', slug: 'technology' },
  { label: '游戏', slug: 'gaming' },
  { label: '动漫与文化', slug: 'anime' },
  { label: '学习成长', slug: 'learning' },
  { label: '生活方式', slug: 'lifestyle' },
]

/** 左栏：导航目的地与话题分类；话题分类为静态目录入口，不伪造热度数据。 */
export function Sidebar() {
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
        <ul className="space-y-0.5 text-sm">
          {TOPIC_LINKS.map((topic) => (
            <li key={topic.slug}>
              <NavLink
                to={`/topics/${topic.slug}`}
                className="sp-transition block rounded-sm px-2 py-1.5 text-muted hover:bg-subtle hover:text-ink"
              >
                {topic.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-1.5 border-t border-line pt-3 text-xs leading-relaxed text-faint">
          <Sparkles size={13} className="mt-0.5 shrink-0" />
          话题目录将在 M3 接入真实数据。
        </p>
      </Card>

      <Card className="p-4 text-xs leading-relaxed text-muted">
        <p className="mb-2 flex items-center gap-1.5 font-medium text-ink">
          <BookOpen size={14} /> 社区准则
        </p>
        <p>尊重每一位成员，围绕兴趣与知识展开讨论。账号仅收集用户名与密码哈希。</p>
        <p className="mt-2 flex items-center gap-1.5 text-faint">
          <Flame size={13} /> 热门榜单将在 M5 接入真实数据。
        </p>
      </Card>
    </aside>
  )
}
