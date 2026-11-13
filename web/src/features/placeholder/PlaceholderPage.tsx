import { ArrowLeft, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Card } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'

type PlaceholderPageProps = {
  title: string
  milestone: string
  description: string
}

/** 里程碑占位页：明确标注未实现状态，不提供点击无效果的伪交互控件。 */
export function PlaceholderPage({ title, milestone, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className={buttonClass('ghost', 'sm', 'mb-4')}>
        <ArrowLeft size={15} /> 返回首页
      </Link>
      <Card className="p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Construction size={20} />
          </span>
          <Badge variant="topic">{milestone}</Badge>
        </div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
        <div className="mt-6 rounded-sm border border-line bg-subtle px-4 py-3 text-xs leading-relaxed text-muted">
          该页面的业务功能尚未实现。当前里程碑交付的是应用外壳、导航结构与视觉基线；
          此占位页用于保证导航目的地可达，不代表功能已可用。
        </div>
      </Card>
    </div>
  )
}
