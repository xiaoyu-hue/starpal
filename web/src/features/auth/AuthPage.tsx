// SPDX-License-Identifier: AGPL-3.0-or-later
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { buttonClass } from '../../components/ui/Button'
import { Card } from '../../components/ui/Primitives'
import { AuthForm } from './AuthForm'

type NoticeState = { notice?: string }

/** 认证页面：登录 / 注册共用外壳，仅切换标题与表单模式。 */
export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register'
  const location = useLocation()
  const notice = (location.state as NoticeState | null)?.notice

  return (
    <div className="mx-auto max-w-md">
      <Link to="/" className={buttonClass('ghost', 'sm', 'mb-4')}>
        <ArrowLeft size={15} /> 返回首页
      </Link>
      <Card className="p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-ink">
          {isRegister ? '创建账号' : '登录星聚'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {isRegister
            ? '星聚目前采用邀请制，注册需要邀请码。我们只收集用户名与密码哈希，不收集手机号或邮箱。'
            : '欢迎回来，输入用户名与密码继续。'}
        </p>

        {notice ? (
          <p
            role="status"
            className="mt-4 rounded-sm border border-line bg-subtle px-4 py-3 text-sm text-ink"
          >
            {notice}
          </p>
        ) : null}

        <AuthForm mode={mode} />

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? '已有账号？' : '还没有账号？'}{' '}
          <Link
            to={isRegister ? '/login' : '/register'}
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            {isRegister ? '去登录' : '去注册'}
          </Link>
        </p>
      </Card>
    </div>
  )
}
