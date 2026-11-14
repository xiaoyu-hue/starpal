// SPDX-License-Identifier: AGPL-3.0-or-later
import { AlertCircle, PenLine, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

type EmptyStateProps = {
  title?: string
  description?: string
  actionLabel?: string
  onAction: () => void
}

/** 空态：文案指向创作行为，不使用演示数据冒充真实内容。 */
export function EmptyState({
  title = '这里还没有内容，第一篇由你写下',
  description = '当社区里还没有真实内容时，显示引导而不是填充示例。',
  actionLabel = '写下第一篇',
  onAction,
}: EmptyStateProps) {
  return (
    <div className="sp-card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <PenLine size={22} />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      <Button className="mt-5" icon={<PenLine size={16} />} onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  )
}

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry: () => void
}

/** 错误态：提供可重试操作与明确文案。 */
export function ErrorState({
  title = '内容加载失败',
  description = '请求未能完成，请稍后重试。若持续失败，请检查服务状态。',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="sp-card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sp-danger-soft)] text-[var(--sp-danger)]">
        <AlertCircle size={22} />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      <Button className="mt-5" variant="secondary" icon={<RefreshCw size={16} />} onClick={onRetry}>
        重新加载
      </Button>
    </div>
  )
}
