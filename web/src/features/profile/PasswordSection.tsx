// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Primitives'
import { PASSWORD_MAX, PASSWORD_MIN } from '../../config/auth-constants'
import { ApiError } from '../../lib/api-client'
import { changePassword } from './api'

/**
 * 自助改密：登录后凭当前口令设置新口令。
 * 前端只做即时提示（长度、两次一致、新旧不同），最终判定以服务端为准。
 * 成功后提示「其它设备需重新登录」——服务端已撤销除当前会话外的全部会话。
 */
export function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function validate(): string {
    if (current.length < PASSWORD_MIN || current.length > PASSWORD_MAX) {
      return '请填写当前密码'
    }
    if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) {
      return `新密码需 ${PASSWORD_MIN}—${PASSWORD_MAX} 个字符`
    }
    if (next !== confirm) return '两次输入的新密码不一致'
    if (next === current) return '新密码不能与当前密码相同'
    return ''
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setDone(false)
    const local = validate()
    if (local) {
      setError(local)
      return
    }
    setBusy(true)
    setError('')
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone(true)
    } catch (cause) {
      // 服务端 VALIDATION_FAILED 会带字段级约束；「当前密码不正确」直接给 message。
      if (cause instanceof ApiError && cause.details?.length) {
        setError(cause.details.map((d) => d.constraint).join('；'))
      } else {
        setError(cause instanceof ApiError ? cause.message : '修改失败，请稍后重试')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <KeyRound size={16} /> 修改密码
      </h2>
      <p className="text-xs leading-relaxed text-muted">
        需要输入当前密码。修改成功后，其它已登录的设备会退出登录，需要重新登录。
      </p>
      <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <Input
          label="当前密码"
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          maxLength={PASSWORD_MAX}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Input
          label="新密码"
          hint={`至少 ${PASSWORD_MIN} 位，建议用密码管理器生成`}
          type="password"
          name="newPassword"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <Input
          label="确认新密码"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p role="alert" className="text-xs text-[var(--sp-danger)]">{error}</p>}
        {done && (
          <p role="status" className="text-xs text-[var(--sp-success)]">
            密码已修改成功，其它设备需重新登录。
          </p>
        )}
        <Button type="submit" variant="primary" size="sm" loading={busy}>
          保存新密码
        </Button>
      </form>
    </Card>
  )
}
