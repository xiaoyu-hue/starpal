// SPDX-License-Identifier: AGPL-3.0-or-later
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Shuffle } from 'lucide-react'
import { Avatar } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'
import { ApiError } from '../../lib/api-client'
import type { AvatarStyle } from '../../types/api'
import { avatarImageUrl, isValidSeed, parseAvatarUrl, randomSeed } from './avatar.api'
import { updateOwnProfile } from './api'

type Props = {
  /** 当前头像 URL（外链或站内预设），来自本人资料。 */
  currentUrl: string | null
  /** 默认种子：用用户名，保证每个人初始头像稳定且不同。 */
  defaultSeed: string
  styles: AvatarStyle[]
  onSaved: (url: string) => void
}

/**
 * 头像选择器：种子 + 31 种风格网格，选中即保存到本人资料。
 *
 * 老用户兼容：若当前头像是外链（parseAvatarUrl 返回 null），显示只读提示且不自动覆盖，
 * 只有用户主动点选某个风格才写入站内 URL——不打断其既有头像。
 */
export function AvatarPicker({ currentUrl, defaultSeed, styles, onSaved }: Props) {
  const parsed = useMemo(() => parseAvatarUrl(currentUrl), [currentUrl])
  const [seed, setSeed] = useState(parsed?.seed ?? defaultSeed)
  const [selected, setSelected] = useState<string | null>(parsed?.slug ?? null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const seedValid = isValidSeed(seed)

  async function choose(slug: string) {
    if (!seedValid || saving) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const url = avatarImageUrl(slug, seed)
      await updateOwnProfile({ avatarUrl: url })
      setSelected(slug)
      setMessage('头像已更新')
      onSaved(url)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar
          name={defaultSeed}
          src={selected !== null && seedValid ? avatarImageUrl(selected, seed) : currentUrl}
          size={56}
        />
        <div className="min-w-0 text-xs text-faint">
          {parsed === null && currentUrl !== null ? (
            <p>当前使用外链头像。任选一种风格即可替换为站内头像。</p>
          ) : (
            <p>选一种风格，头像由你的种子自动生成；别人看到的也是同一张。</p>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-sm font-medium text-ink">头像种子</span>
          <input
            className="sp-input"
            value={seed}
            maxLength={64}
            onChange={(e) => {
              setSeed(e.target.value)
              setError('')
            }}
            aria-invalid={!seedValid}
            aria-describedby="avatar-seed-hint"
          />
        </label>
        <button
          type="button"
          className={buttonClass('secondary', 'sm')}
          onClick={() => {
            setSeed(randomSeed())
            setError('')
          }}
          aria-label="换一个随机种子"
        >
          <Shuffle size={14} className="mr-1 inline-block align-[-2px]" /> 换一个
        </button>
      </div>
      {!seedValid && (
        <p id="avatar-seed-hint" className="text-xs text-[var(--sp-danger)]">
          种子为 1–64 字，仅限文字、数字、空格、连字符与下划线。
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">选择风格（{styles.length} 种）</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {styles.map((style) => {
            const active = selected === style.slug
            return (
              <button
                key={style.slug}
                type="button"
                disabled={!seedValid || saving}
                onClick={() => void choose(style.slug)}
                aria-pressed={active}
                title={style.label}
                className={`flex flex-col items-center gap-1 rounded-md border p-2 transition-colors disabled:opacity-50 ${
                  active ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
                }`}
              >
                <Avatar name={style.label} src={avatarImageUrl(style.slug, seed)} size={40} />
                <span className="w-full truncate text-center text-[11px] text-muted">{style.label}</span>
                {active && <Check size={12} className="text-accent" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </fieldset>

      {message && <p role="status" className="text-xs text-accent">{message}</p>}
      {error && <p role="alert" className="text-xs text-[var(--sp-danger)]">{error}</p>}
      <p className="text-xs text-faint">
        头像图案来自开源项目 DiceBear，作者与许可见{' '}
        <Link to="/avatar-credits" className="text-accent underline">头像署名</Link>。
      </p>
    </div>
  )
}
