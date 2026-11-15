// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type FormEvent } from 'react'
import { Card } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'
import { ApiError } from '../../lib/api-client'
import { ANNOUNCEMENT_KIND_META } from '../_static'
import type { AdminAnnouncement, AnnouncementKind, AnnouncementStatus } from '../../types/api'
import type { AnnouncementPayload } from './announcements.api'

const KINDS = Object.keys(ANNOUNCEMENT_KIND_META) as AnnouncementKind[]
const TITLE_MAX = 120
const SUMMARY_MAX = 300
const BODY_MAX = 5000

/**
 * 公告编辑表单（新建与编辑共用）。
 *
 * 发布状态做成单选项而不是「保存草稿 / 保存并发布」两个按钮：
 * 后者在已发布条目上会让「保存草稿」看起来像普通保存，一点就把线上公告撤下去了。
 * 一个保存按钮 + 显式的状态选择，误触代价最小。
 */
export function AnnouncementEditor({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: AdminAnnouncement | null
  onSubmit: (payload: AnnouncementPayload) => Promise<void>
  onCancel: () => void
}) {
  const [kind, setKind] = useState<AnnouncementKind>(initial?.kind ?? 'notice')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [body, setBody] = useState(initial?.points.join('\n') ?? '')
  const [isPinned, setIsPinned] = useState(initial?.pinned ?? false)
  const [status, setStatus] = useState<AnnouncementStatus>(initial?.status ?? 'draft')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ kind, title, summary, body, isPinned, status })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          {initial ? '编辑公告' : '新建公告'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          摘要会出现在右栏卡片上，必须能独立读懂；正文每行一条要点，空行会被忽略。
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <label htmlFor="ann-kind" className="mb-1 block text-sm font-medium text-ink">
            类型
          </label>
          <select
            id="ann-kind"
            className="sp-input"
            value={kind}
            onChange={(e) => setKind(e.target.value as AnnouncementKind)}
          >
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {ANNOUNCEMENT_KIND_META[value].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ann-title" className="mb-1 block text-sm font-medium text-ink">
            标题
          </label>
          <input
            id="ann-title"
            className="sp-input"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-faint">
            {Array.from(title).length} / {TITLE_MAX}
          </p>
        </div>

        <div>
          <label htmlFor="ann-summary" className="mb-1 block text-sm font-medium text-ink">
            摘要
          </label>
          <textarea
            id="ann-summary"
            className="sp-input min-h-[70px] resize-y"
            value={summary}
            maxLength={SUMMARY_MAX}
            onChange={(e) => setSummary(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-faint">
            {Array.from(summary).length} / {SUMMARY_MAX}
          </p>
        </div>

        <div>
          <label htmlFor="ann-body" className="mb-1 block text-sm font-medium text-ink">
            正文（每行一条，可留空）
          </label>
          <textarea
            id="ann-body"
            className="sp-input min-h-[160px] resize-y"
            value={body}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">发布状态</legend>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="ann-status"
              checked={status === 'draft'}
              onChange={() => setStatus('draft')}
            />
            存为草稿（前台看不到）
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="ann-status"
              checked={status === 'published'}
              onChange={() => setStatus('published')}
            />
            立即发布（前台可见）
          </label>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
          置顶（排在公告页最前，右栏优先展示）
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={buttonClass('primary', 'sm')} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
          <button type="button" className={buttonClass('secondary', 'sm')} onClick={onCancel}>
            取消
          </button>
          {error && (
            <span role="alert" className="text-xs text-[var(--sp-danger)]">
              {error}
            </span>
          )}
        </div>
      </Card>
    </form>
  )
}
