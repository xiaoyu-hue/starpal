import { useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ApiError } from '../../lib/api-client'
import type { LoginPayload, RegisterPayload } from '../../types/api'
import { useAuth } from './AuthProvider'

// 与 server/src/config/constants.ts 的准入规则保持一致。
// 前端只做即时提示以改善体验，服务端校验始终是最终判定。
const USERNAME_MIN = 3
const USERNAME_MAX = 32
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/
const PASSWORD_MIN = 12
const PASSWORD_MAX = 128
const DISPLAY_NAME_MAX = 64

type Mode = 'login' | 'register'
type FieldKey = 'username' | 'password' | 'displayName' | 'inviteCode'
type FieldErrors = Partial<Record<FieldKey, string>>
type FormValues = Record<FieldKey | 'website', string>

const EMPTY: FormValues = {
  username: '',
  password: '',
  displayName: '',
  inviteCode: '',
  website: '',
}

type GateState = { from?: unknown }

/** 只接受站内绝对路径，阻断 //host、反斜杠与协议注入造成的开放重定向。 */
function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  return value
}

/** 登录 / 注册共用表单：语义标签、错误关联、密码管理器提示与蜜罐字段。 */
export function AuthForm({ mode }: { mode: Mode }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register } = useAuth()
  const honeypotId = useId()
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // 同意条款：注册前必须勾选。不预勾选——默认勾选等于没问过。
  const [agreed, setAgreed] = useState(false)

  function setField(key: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    // 用户一开始修改就清掉错误，避免 aria-invalid 一直挂在正在改正的输入框上。
    if (key !== 'website') {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
    if (formError) setFormError(null)
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    const username = values.username.trim()
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      errors.username = `用户名需 ${USERNAME_MIN}—${USERNAME_MAX} 个字符`
    } else if (!USERNAME_PATTERN.test(username)) {
      errors.username = '仅允许字母、数字、下划线'
    }
    if (values.password.length < PASSWORD_MIN || values.password.length > PASSWORD_MAX) {
      errors.password = `密码需 ${PASSWORD_MIN}—${PASSWORD_MAX} 个字符`
    }
    if (isRegister) {
      if (values.displayName.trim().length > DISPLAY_NAME_MAX) {
        errors.displayName = `昵称最多 ${DISPLAY_NAME_MAX} 个字符`
      }
      if (!values.inviteCode.trim()) errors.inviteCode = '请输入邀请码'
    }
    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    if (isRegister && !agreed) {
      setFormError('请先阅读并勾选同意《用户协议》与《隐私说明》')
      return
    }

    setFieldErrors({})
    setFormError(null)
    setSubmitting(true)
    try {
      if (isRegister) {
        const payload: RegisterPayload = {
          username: values.username.trim(),
          password: values.password,
          inviteCode: values.inviteCode.trim(),
          acceptTerms: agreed,
          website: values.website,
        }
        if (values.displayName.trim()) payload.displayName = values.displayName.trim()
        const created = await register(payload)
        navigate('/login', {
          replace: true,
          state: { notice: `账号 ${created.username} 创建成功，请登录` },
        })
      } else {
        const payload: LoginPayload = {
          username: values.username.trim(),
          password: values.password,
        }
        await login(payload)
        const gate = location.state as GateState | null
        navigate(safeReturnTo(gate?.from), { replace: true })
      }
    } catch (error) {
      // 后端 message 已是面向用户的中文提示；字段级细节留给前端本地校验。
      setFormError(error instanceof ApiError ? error.message : '操作失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      {formError ? (
        <p
          role="alert"
          className="rounded-sm border border-[var(--sp-danger)] bg-[var(--sp-danger-soft)] px-3 py-2 text-sm text-[var(--sp-danger)]"
        >
          {formError}
        </p>
      ) : null}

      <Input
        label="用户名"
        name="username"
        autoComplete="username"
        required
        aria-required
        maxLength={USERNAME_MAX}
        value={values.username}
        onChange={(event) => setField('username', event.target.value)}
        error={fieldErrors.username}
        hint="3—32 位，字母、数字或下划线"
        disabled={submitting}
      />

      {isRegister ? (
        <Input
          label="昵称（选填）"
          name="displayName"
          autoComplete="nickname"
          maxLength={DISPLAY_NAME_MAX}
          value={values.displayName}
          onChange={(event) => setField('displayName', event.target.value)}
          error={fieldErrors.displayName}
          hint="留空则使用用户名"
          disabled={submitting}
        />
      ) : null}

      <Input
        label="密码"
        name="password"
        type="password"
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        required
        aria-required
        maxLength={PASSWORD_MAX}
        value={values.password}
        onChange={(event) => setField('password', event.target.value)}
        error={fieldErrors.password}
        hint={isRegister ? `至少 ${PASSWORD_MIN} 位，建议用密码管理器生成` : undefined}
        disabled={submitting}
      />

      {isRegister ? (
        <Input
          label="邀请码"
          name="inviteCode"
          autoComplete="off"
          required
          aria-required
          value={values.inviteCode}
          onChange={(event) => setField('inviteCode', event.target.value)}
          error={fieldErrors.inviteCode}
          hint="星聚目前为邀请制，请向邀请人索取"
          disabled={submitting}
        />
      ) : null}

      {/* 同意条款：仅注册页出现。链接用新标签打开，避免用户点开条款后填了一半的表单被清空。 */}
      {isRegister ? (
        <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--sp-accent)]"
          />
          <span>
            我已阅读并同意
            <Link to="/terms" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              《用户协议》
            </Link>
            与
            <Link to="/privacy" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              《隐私说明》
            </Link>
          </span>
        </label>
      ) : null}

      {/* 蜜罐：移出视野、读屏不可见、键盘不可达；真人不会填，脚本填了由服务端静默丢弃。 */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label htmlFor={honeypotId}>请勿填写此字段</label>
        <input
          id={honeypotId}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => setField('website', event.target.value)}
        />
      </div>

      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {isRegister ? '创建账号' : '登录'}
      </Button>
    </form>
  )
}
