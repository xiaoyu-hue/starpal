import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Avatar, Card } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'
import { ApiError } from '../../lib/api-client'
import { useAuth } from '../auth/AuthProvider'
import { useOwnProfileQuery } from './queries'
import { updateOwnProfile } from './api'
import {
  AGE_BAND_VALUES,
  MBTI_VALUES,
  ZODIAC_VALUES,
} from '../../config/profile-constants'
import { AccountSection, Field, Select, ThemeSection, AboutSection } from './SettingsSections'
import type { OwnProfile } from '../../types/api'

/** 设置页编排：资料编辑、主题、关于与账号。由路由级 RequireAuth 守卫进入。 */
export function SettingsPage() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const query = useOwnProfileQuery()

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-3" role="status" aria-live="polite">
        <div className="sp-skeleton h-64 w-full rounded-md" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center text-sm text-muted">
        资料读取失败，请刷新后重试。
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-ink">设置</h1>
      <ProfileSection key={query.data.username} profile={query.data} onSaved={refresh} />
      <ThemeSection />
      <AboutSection />
      <AccountSection onDeleted={() => { void refresh(); navigate('/') }} />
    </div>
  )
}

/** 资料编辑表单：仅提交变更字段，支持逐项清空。 */
function ProfileSection({
  profile,
  onSaved,
}: {
  profile: OwnProfile
  onSaved: () => void
}) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')
  const [biography, setBiography] = useState(profile.biography ?? '')
  const [zodiac, setZodiac] = useState(profile.zodiac ?? '')
  const [mbti, setMbti] = useState(profile.mbti ?? '')
  const [ageBand, setAgeBand] = useState(profile.ageBand ?? '')
  const [showOptional, setShowOptional] = useState(profile.showOptional)

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const dirty = useMemo(
    () =>
      displayName !== profile.displayName ||
      avatarUrl !== (profile.avatarUrl ?? '') ||
      biography !== (profile.biography ?? '') ||
      zodiac !== (profile.zodiac ?? '') ||
      mbti !== (profile.mbti ?? '') ||
      ageBand !== (profile.ageBand ?? '') ||
      showOptional !== profile.showOptional,
    [displayName, avatarUrl, biography, zodiac, mbti, ageBand, showOptional, profile],
  )

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setStatus('saving')
    setErrors({})
    setMessage('')
    const payload: Record<string, unknown> = {}
    if (displayName !== profile.displayName) payload.displayName = displayName
    if (avatarUrl !== (profile.avatarUrl ?? '')) {
      payload.avatarUrl = avatarUrl.trim() === '' ? null : avatarUrl.trim()
    }
    if (biography !== (profile.biography ?? '')) {
      payload.biography = biography.trim() === '' ? null : biography.trim()
    }
    if (zodiac !== (profile.zodiac ?? '')) payload.zodiac = zodiac === '' ? null : zodiac
    if (mbti !== (profile.mbti ?? '')) payload.mbti = mbti === '' ? null : mbti
    if (ageBand !== (profile.ageBand ?? '')) payload.ageBand = ageBand === '' ? null : ageBand
    if (showOptional !== profile.showOptional) payload.showOptional = showOptional

    try {
      await updateOwnProfile(payload)
      setStatus('saved')
      setMessage('资料已更新')
      onSaved()
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_FAILED' && error.details) {
        const next: Partial<Record<string, string>> = {}
        for (const d of error.details) next[d.field] = d.constraint
        setErrors(next)
      }
      setStatus('error')
      setMessage(error instanceof ApiError ? error.message : '更新失败，请稍后重试')
    }
  }

  return (
    <form onSubmit={handleSave} className="sp-card space-y-4 p-6">
      <h2 className="text-base font-semibold text-ink">资料</h2>

      <div className="flex items-center gap-3">
        <Avatar name={displayName || profile.username} src={avatarUrl || null} size={56} />
        <p className="text-xs text-faint">头像为图片链接；图片上传将在后续版本开放。</p>
      </div>

      <Field label="显示名" htmlFor="displayName" error={errors.displayName}>
        <input
          id="displayName"
          className="sp-input"
          value={displayName}
          maxLength={64}
          onChange={(e) => setDisplayName(e.target.value)}
          aria-invalid={Boolean(errors.displayName)}
          autoComplete="nickname"
        />
      </Field>

      <Field label="头像链接" htmlFor="avatarUrl" error={errors.avatarUrl}>
        <input
          id="avatarUrl"
          className="sp-input"
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          aria-invalid={Boolean(errors.avatarUrl)}
        />
      </Field>

      <Field label="简介" htmlFor="biography" error={errors.biography}>
        <textarea
          id="biography"
          className="sp-input min-h-[80px] resize-y"
          maxLength={300}
          value={biography}
          onChange={(e) => setBiography(e.target.value)}
          aria-invalid={Boolean(errors.biography)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="星座" htmlFor="zodiac">
          <Select id="zodiac" value={zodiac} onChange={setZodiac} options={ZODIAC_VALUES} />
        </Field>
        <Field label="MBTI" htmlFor="mbti">
          <Select id="mbti" value={mbti} onChange={setMbti} options={MBTI_VALUES} />
        </Field>
        <Field label="年龄段" htmlFor="ageBand">
          <Select id="ageBand" value={ageBand} onChange={setAgeBand} options={AGE_BAND_VALUES} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={showOptional}
          onChange={(e) => setShowOptional(e.target.checked)}
        />
        公开星座 / MBTI / 年龄段（默认不公开）
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className={buttonClass('primary', 'sm')} disabled={!dirty || status === 'saving'}>
          {status === 'saving' ? '保存中…' : '保存资料'}
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
