// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type FormEvent, type ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Link } from 'react-router-dom'
import { Flag, X } from 'lucide-react'
import { ApiError } from '../../lib/api-client'
import { Button, buttonClass, type ButtonSize, type ButtonVariant } from '../../components/ui/Button'
import { useAuth } from '../auth'
import type { ReportKind, ReportReason, ReportTargetType } from '../../types/reports'
import { REPORT_DETAIL_MAX, REPORT_DETAIL_MIN, REPORT_REASONS } from '../../types/reports'
import { useSubmitReportMutation } from './reports.queries'

type Props = {
  kind: ReportKind
  targetType?: ReportTargetType
  targetId?: number
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  trigger?: ReactNode
  /** 列表场景（如评论条目）：未登录时不渲染，避免每条都出现一个登录引导链接。 */
  hideWhenGuest?: boolean
}

/** 领域错误 → 一句中文；与 posts/errors.ts 同口径，待第三处复用再抽到 lib。 */
function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.details && error.details.length > 0) {
      return error.details.map((d) => `${d.field}：${d.constraint}`).join('；')
    }
    return error.message
  }
  return fallback
}

function countChars(text: string): number {
  return Array.from(text).length
}

/**
 * 举报 / 申诉提交入口。两种诉求共用一份表单：
 * - report 需选原因（服务端还要求目标存在且可见）；
 * - appeal 只需说明，服务端固定 reason、忽略任何 target。
 * 身份一律由会话判定；未登录不显示可点但必失败的表单，改为引导登录。
 * 提交成功后失效本人的提交列表，关闭对话框；失败保留输入并展示原因（不吞错）。
 */
export function ReportButton({
  kind,
  targetType,
  targetId,
  label,
  variant = 'ghost',
  size = 'sm',
  trigger,
  hideWhenGuest = false,
}: Props) {
  const { user } = useAuth()
  const mutation = useSubmitReportMutation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isAppeal = kind === 'appeal'
  const title = isAppeal ? '提交申诉' : '举报这条内容'
  const description = isAppeal
    ? '如果你认为某项处理有误，请写清涉及的内容或操作、以及具体理由。只写「我没错」我们无从核对。'
    : '请选择原因并写清具体情况，运营者会看到并处理。举报内容只有你和运营者可见。'
  const text = label ?? (isAppeal ? '提交申诉' : '举报')
  const length = countChars(detail)
  const valid = length >= REPORT_DETAIL_MIN && length <= REPORT_DETAIL_MAX

  if (!user) {
    if (hideWhenGuest) return null
    return (
      <Link to="/login" className={buttonClass('ghost', size)} state={{ notice: '该操作需要登录后使用' }}>
        {text}
      </Link>
    )
  }

  function handleClose(next: boolean) {
    setOpen(next)
    if (!next) {
      // 关闭时重置，避免下次打开残留上一条说明或成功态。
      setDetail('')
      setReason('spam')
      setError(null)
      setDone(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid || mutation.isPending) return
    setError(null)
    mutation.mutate(
      isAppeal
        ? { kind: 'appeal', detail: detail.trim() }
        : { kind: 'report', targetType, targetId, reason, detail: detail.trim() },
      {
        onSuccess: () => setDone(true),
        onError: (cause) => setError(messageOf(cause, '提交失败，请稍后重试。')),
      },
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
      <DialogPrimitive.Trigger asChild>
        {trigger ?? (
          <button type="button" className={buttonClass(variant, size)}>
            <Flag size={14} aria-hidden="true" /> {text}
          </button>
        )}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sp-overlay" />
        <DialogPrimitive.Content className="sp-dialog sp-glass sp-enter">
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="text-lg font-semibold text-ink">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="sp-transition rounded-sm p-1 text-faint hover:bg-subtle hover:text-ink"
              aria-label="关闭对话框"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </DialogPrimitive.Description>

          {done ? (
            <div className="mt-5" role="status">
              <p className="text-sm text-ink">
                {isAppeal ? '申诉已提交，我们会在 7 日内答复。' : '举报已提交，感谢你帮忙维护社区。'}
              </p>
              <p className="mt-1.5 text-sm text-muted">
                可以在「我的提交」里查看处理状态与答复。
              </p>
              <div className="mt-5 flex justify-end">
                <Button size="sm" onClick={() => handleClose(false)}>
                  知道了
                </Button>
              </div>
            </div>
          ) : (
            <form className="mt-5" onSubmit={handleSubmit}>
              {!isAppeal && (
                <div>
                  <label htmlFor="report-reason" className="mb-1.5 block text-sm font-medium text-ink">
                    原因
                  </label>
                  <select
                    id="report-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    className="sp-transition w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label htmlFor="report-detail" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
                {isAppeal ? '申诉说明' : '具体情况'}
              </label>
              <textarea
                id="report-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={4}
                placeholder={isAppeal ? '涉及的内容或操作、你认为处理有误的具体理由…' : '请描述具体问题，便于核对…'}
                aria-invalid={length > REPORT_DETAIL_MAX || undefined}
                aria-describedby="report-counter"
                className="sp-transition w-full resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-faint focus:border-accent"
              />
              <p id="report-counter" className="mt-1.5 text-xs text-faint">
                {length} / {REPORT_DETAIL_MAX}（至少 {REPORT_DETAIL_MIN} 字）
              </p>

              {error ? (
                <p className="mt-2 text-xs text-[var(--sp-danger)]" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-5 flex justify-end gap-2">
                <DialogPrimitive.Close className={buttonClass('secondary', 'sm')}>
                  取消
                </DialogPrimitive.Close>
                <Button type="submit" size="sm" loading={mutation.isPending} disabled={!valid}>
                  提交
                </Button>
              </div>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
