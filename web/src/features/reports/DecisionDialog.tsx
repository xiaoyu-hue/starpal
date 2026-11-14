// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type FormEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { ApiError } from '../../lib/api-client'
import { Button, buttonClass } from '../../components/ui/Button'
import { REPORT_NOTE_MAX, type ReportDecision } from '../../types/reports'
import { useDecisionMutation } from './reports.queries'

/** 决策动作中文：resolve 是「采纳并标记已处理」，dismiss 是「驳回」。 */
const DECISIONS: { value: ReportDecision; label: string; hint: string }[] = [
  { value: 'resolve', label: '标记已处理', hint: '认定诉求成立或已完成处理' },
  { value: 'dismiss', label: '驳回', hint: '认定无需处理或诉求不成立' },
]

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return '操作失败，请稍后重试。'
}

/**
 * 管理员决策对话框：只改状态与答复，不做任何内容处置。
 * 与「移除内容 / 停用账号」刻意分离——那是 M6 完整治理后台的范围，
 * 误触代价高，最小版不提供。答复会展示给提交人，故允许留空但建议填写。
 */
export function DecisionDialog({ reportId }: { reportId: number }) {
  const mutation = useDecisionMutation()
  const [open, setOpen] = useState(false)
  const [decision, setDecision] = useState<ReportDecision>('resolve')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const tooLong = Array.from(note).length > REPORT_NOTE_MAX

  function handleClose(next: boolean) {
    setOpen(next)
    if (!next) {
      setNote('')
      setDecision('resolve')
      setError(null)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (tooLong || mutation.isPending) return
    setError(null)
    mutation.mutate(
      { id: reportId, payload: { decision, note: note.trim() || undefined } },
      {
        onSuccess: () => handleClose(false),
        onError: (cause) => setError(messageOf(cause)),
      },
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
      <DialogPrimitive.Trigger asChild>
        <button type="button" className={buttonClass('secondary', 'sm')}>
          处理
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sp-overlay" />
        <DialogPrimitive.Content className="sp-dialog sp-glass sp-enter">
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="text-lg font-semibold text-ink">
              处理这条提交
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="sp-transition rounded-sm p-1 text-faint hover:bg-subtle hover:text-ink"
              aria-label="关闭对话框"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted">
            这里只标记状态并填写答复，不会移除内容或停用账号。
          </DialogPrimitive.Description>

          <form className="mt-5" onSubmit={handleSubmit}>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">处理结果</legend>
              <div className="space-y-2">
                {DECISIONS.map((d) => (
                  <label
                    key={d.value}
                    className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line px-3 py-2.5 text-sm"
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={d.value}
                      checked={decision === d.value}
                      onChange={() => setDecision(d.value)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-ink">{d.label}</span>
                      <span className="ml-2 text-xs text-muted">{d.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label htmlFor="decision-note" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              答复（可选，会展示给提交人）
            </label>
            <textarea
              id="decision-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="说明维持原处理或采纳的理由…"
              aria-invalid={tooLong || undefined}
              className="sp-transition w-full resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <p className="mt-1.5 text-xs text-faint">
              {Array.from(note).length} / {REPORT_NOTE_MAX}
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
              <Button type="submit" size="sm" loading={mutation.isPending} disabled={tooLong}>
                确认
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
