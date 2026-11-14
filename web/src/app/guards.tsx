// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FeedSkeleton } from '../features/feed/components/FeedSkeleton'
import { useAuth } from '../features/auth/AuthProvider'

/**
 * 前端路由守卫（仅体验层）。
 *
 * 权限判定始终以服务端响应为准：这里只负责「未登录别让用户白跑一趟」，
 * 以及登录后把用户送回原本想去的地址。即使有人改了前端状态绕过这里，
 * 受保护 API 仍由 require-auth / require-role 拒绝（ARCHITECTURE.md §284）。
 *
 * 放在 app/ 而非 features/auth/index.ts：后者会静态导出 AuthPage，
 * 从它导入会把已做路由级懒加载的认证页连带打进主包。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const from = `${location.pathname}${location.search}`

  // 首屏尚未读完 /api/auth/me：显示骨架，避免把已登录用户误判成访客后跳走。
  if (loading) return <FeedSkeleton count={2} />
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ notice: '该页面需要登录后访问', from }}
      />
    )
  }
  return <>{children}</>
}

/**
 * 角色守卫（同样只是体验层）：普通用户敲管理网址时，友好地挡回首页，
 * 而不是让他进到一个必然 403 的空页面。
 *
 * 权限判定始终以服务端为准：/api/admin/* 整组挂 requireAuth + requireRole(admin)，
 * 改前端状态绕过这里也拿不到数据。这里只认 user.role === 'admin'，
 * 与后端 ROLE_ADMIN 同名；不引入新的角色枚举或状态库。
 */
export function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FeedSkeleton count={2} />
  if (!user) {
    return <Navigate to="/login" replace state={{ notice: '该页面需要登录后访问' }} />
  }
  if (user.role !== role) {
    return (
      <Navigate
        to="/"
        replace
        state={{ notice: '这个页面只有管理员可以打开' }}
      />
    )
  }
  return <>{children}</>
}
