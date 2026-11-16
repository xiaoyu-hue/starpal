// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

/**
 * 治理后台统一骨架：顶部六分区导航，当前分区高亮。
 * 举报分区复用既有 /admin/reports 页面，公告分区复用 /admin/announcements，
 * 故导航里的链接指向各自既有路由，只有用户 / 内容 / 话题 / 统计在本 feature 内。
 */
const SECTIONS: { to: string; label: string }[] = [
  { to: '/admin', label: '概览' },
  { to: '/admin/users', label: '用户' },
  { to: '/admin/posts', label: '帖子' },
  { to: '/admin/comments', label: '评论' },
  { to: '/admin/topics', label: '话题' },
  { to: '/admin/reports', label: '举报' },
  { to: '/admin/stats', label: '统计' },
  { to: '/admin/announcements', label: '公告' },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <section aria-label="治理后台" className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink">治理后台</h1>
        <p className="mt-1 text-sm text-muted">
          仅运营者可见。所有处置都会记入审核日志，可恢复的操作不会物理删除数据。
        </p>
      </div>
      <nav aria-label="后台分区" className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => {
          const active = s.to === '/admin' ? pathname === '/admin' : pathname.startsWith(s.to)
          return (
            <Link
              key={s.to}
              to={s.to}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'sp-transition rounded-sm border border-accent bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent'
                  : 'sp-transition rounded-sm border border-line bg-surface px-3 py-1.5 text-sm text-muted hover:border-line-strong hover:text-ink'
              }
            >
              {s.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </section>
  )
}
