// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Trash2, UserX, type LucideIcon } from 'lucide-react'
import { Card } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'
import { ApiError } from '../../lib/api-client'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../auth'
import { deleteOwnAccount, eraseOwnAccount } from './api'

/** 版本号由构建注入（`web/vite.config.ts` → 包版本），此处不写死。 */
const APP_VERSION = __APP_VERSION__

/**
 * 设置页的「一句说明 + 一个入口」卡片。
 * 收藏、点赞、提交、成就四张完全同构，抽出来避免四处复制；图标用线性图标是
 * 因为这里的语义是「可以点进去」，与成就页那套实心印章（表示「你做到了」）分工不同。
 */
export function LinkCard({
  icon: Icon,
  title,
  description,
  to,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  to: string
  action: string
}) {
  return (
    <Card className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:flex-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Icon size={16} /> {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      </div>
      <Link to={to} className={buttonClass('secondary', 'sm', 'shrink-0 self-start')}>
        {action}
      </Link>
    </Card>
  )
}

/** 主题选择：浅色 / 深色 / 跟随系统，选择保存在本机并刷新保留。 */
export function ThemeSection() {
  const { theme, setTheme } = useTheme()
  const options: { value: 'light' | 'dark' | 'system'; label: string }[] = [
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
    { value: 'system', label: '跟随系统' },
  ]
  return (
    <Card className="space-y-3 p-6">
      <h2 className="text-base font-semibold text-ink">主题</h2>
      <div className="flex gap-2" role="radiogroup" aria-label="主题选择">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={theme === opt.value}
            onClick={() => setTheme(opt.value)}
            className={buttonClass('secondary', 'sm', theme === opt.value ? 'bg-accent-soft text-accent' : '')}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-faint">选择会保存在本机，刷新后保留。</p>
    </Card>
  )
}

/** 关于：当前版本与检查更新状态。 */
export function AboutSection() {
  const [checked, setChecked] = useState(false)
  return (
    <Card className="space-y-3 p-6">
      <h2 className="text-base font-semibold text-ink">关于</h2>
      <p className="text-sm text-muted">星聚 STARPAL · 当前版本 {APP_VERSION}</p>
      <button
        type="button"
        className={buttonClass('secondary', 'sm')}
        onClick={() => setChecked(true)}
      >
        <RefreshCw size={14} /> 检查更新
      </button>
      {checked && (
        <p role="status" className="text-xs text-faint">
          已是最新版本（{APP_VERSION}）。
        </p>
      )}
    </Card>
  )
}

/** 账号：软删除（注销）与彻底擦除，均需二次确认，操作不可撤销。 */
export function AccountSection({ onDeleted }: { onDeleted: () => void }) {
  const { logout } = useAuth()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmErase, setConfirmErase] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setBusy(true)
    setError('')
    try {
      await deleteOwnAccount()
      await logout()
      onDeleted()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '操作失败，请稍后重试')
      setBusy(false)
    }
  }

  async function handleErase() {
    setBusy(true)
    setError('')
    try {
      await eraseOwnAccount()
      await logout()
      onDeleted()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '操作失败，请稍后重试')
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4 border border-[var(--sp-danger-soft)] p-6">
      <h2 className="text-base font-semibold text-ink">账号</h2>
      <p className="text-xs leading-relaxed text-muted">
        注销后账号进入软删除，已发布内容保留并署名「已注销用户」。彻底擦除会清除你的可识别信息，此操作不可撤销。
      </p>

      {!confirmDelete ? (
        <button
          type="button"
          className={buttonClass('secondary', 'sm')}
          onClick={() => setConfirmDelete(true)}
        >
          <UserX size={14} /> 注销账号
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2" role="alert">
          <span className="text-xs text-[var(--sp-danger)]">确认注销？此操作会使账号进入软删除。</span>
          <button
            type="button"
            className={buttonClass('primary', 'sm', 'bg-[var(--sp-danger)] text-[var(--sp-on-danger)]')}
            disabled={busy}
            onClick={() => void handleDelete()}
          >
            确认注销
          </button>
          <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => setConfirmDelete(false)}>
            取消
          </button>
        </div>
      )}

      {!confirmErase ? (
        <button
          type="button"
          className={buttonClass('ghost', 'sm', 'text-[var(--sp-danger)]')}
          onClick={() => setConfirmErase(true)}
        >
          <Trash2 size={14} /> 彻底擦除我的数据
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2" role="alert">
          <span className="text-xs text-[var(--sp-danger)]">彻底擦除不可撤销，确认继续？</span>
          <button
            type="button"
            className={buttonClass('primary', 'sm', 'bg-[var(--sp-danger)] text-[var(--sp-on-danger)]')}
            disabled={busy}
            onClick={() => void handleErase()}
          >
            确认擦除
          </button>
          <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => setConfirmErase(false)}>
            取消
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-[var(--sp-danger)]">{error}</p>}
    </Card>
  )
}

type FieldProps = {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-[var(--sp-danger)]">{error}</p>
      )}
    </div>
  )
}

export function Select({
  id,
  value,
  onChange,
  options,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  return (
    <select id={id} className="sp-input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">不填写</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}
