import { Megaphone, TrendingUp, Bookmark } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../../components/ui/Primitives'

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

/** 右栏：热门 / 公告 / 推荐。无真实数据时显示明确空态，不出现空白面板。 */
export function RightRail() {
  return (
    <aside aria-label="推荐与公告" className="space-y-4">
      <RailCard title="热门话题" icon={<TrendingUp size={15} />}>
        <p className="rounded-sm border border-line bg-subtle px-3 py-4 text-center text-xs text-muted">
          暂无真实话题数据
        </p>
      </RailCard>

      <RailCard title="社区公告" icon={<Megaphone size={15} />}>
        <p className="text-xs leading-relaxed text-muted">
          星聚 STARPAL 正在建设中。当前版本为应用外壳，功能按里程碑逐步交付。
        </p>
      </RailCard>

      <RailCard title="为你推荐" icon={<Bookmark size={15} />}>
        <p className="rounded-sm border border-line bg-subtle px-3 py-4 text-center text-xs text-muted">
          登录后按显式选择的话题生成推荐
        </p>
      </RailCard>
    </aside>
  )
}
