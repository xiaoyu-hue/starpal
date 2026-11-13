import { useState } from 'react'
import { ArrowRight, Star } from 'lucide-react'
import { Button } from '../../../components/ui/Button'

export function ButtonSection() {
  const [clicks, setClicks] = useState(0)

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-medium text-faint">变体</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setClicks((value) => value + 1)}>主要操作</Button>
          <Button variant="secondary">次要操作</Button>
          <Button variant="ghost">轻量操作</Button>
          <Button variant="danger">危险操作</Button>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium text-faint">尺寸与图标</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="secondary" icon={<Star size={14} />}>
            小尺寸
          </Button>
          <Button size="md" variant="secondary">
            中尺寸
          </Button>
          <Button size="lg" variant="secondary" icon={<ArrowRight size={16} />}>
            大尺寸
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium text-faint">状态</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>禁用</Button>
          <Button loading>加载中</Button>
        </div>
      </div>

      <div className="rounded-sm bg-subtle px-3 py-2 text-sm text-muted">
        「主要操作」点击次数：<span className="font-semibold text-accent">{clicks}</span>
        <span className="ml-2 text-xs text-faint">（组件真实状态，非假交互）</span>
      </div>
    </div>
  )
}
