// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Check } from 'lucide-react'
import { buttonClass } from '../../components/ui/Button'
import { ApiError } from '../../lib/api-client'
import { updateOwnTitles } from './api'
import { TITLE_CATALOG } from '../users'

/** 头衔编辑（管理员专属，M5.5-S1）：从预设目录勾选要展示的头衔，其他人只读。 */
export function TitlesSection({
  titles,
  onSaved,
}: {
  titles: string[]
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<string[]>(titles)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const dirty = selected.slice().sort().join(',') !== titles.slice().sort().join(',')

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setStatus('saving')
    setMessage('')
    try {
      await updateOwnTitles(selected)
      setStatus('saved')
      setMessage('头衔已更新')
      onSaved()
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof ApiError ? error.message : '更新失败，请稍后重试')
    }
  }

  return (
    <form onSubmit={handleSave} className="sp-card space-y-4 p-6">
      <h2 className="text-base font-semibold text-ink">头衔</h2>
      <p className="text-sm leading-relaxed text-muted">
        头衔显示在资料页与帖子、评论的署名处，对所有访客可见。颜色与含义固定，不能自定义。
      </p>
      <div className="space-y-2">
        {Object.entries(TITLE_CATALOG).map(([id, meta]) => {
          const checked = selected.includes(id)
          return (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-line p-3"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(id)}
                className="h-4 w-4 shrink-0"
              />
              <span
                className="inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium"
                style={{ color: `var(${meta.varName})`, borderColor: `var(${meta.varName})` }}
              >
                {meta.label}
              </span>
              <span className="text-sm text-muted">{meta.note}</span>
            </label>
          )
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className={buttonClass('primary', 'sm')}
          disabled={!dirty || status === 'saving'}
        >
          {status === 'saving' ? '保存中…' : '保存头衔'}
        </button>
        {status === 'saved' && (
          <span role="status" className="flex items-center gap-1 text-xs text-accent">
            <Check size={14} /> {message}
          </span>
        )}
        {status === 'error' && (
          <span role="alert" className="text-xs text-[var(--sp-danger)]">{message}</span>
        )}
      </div>
    </form>
  )
}
