// SPDX-License-Identifier: AGPL-3.0-or-later
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { StarpalMark } from '../../components/brand/StarpalLogo'
import { buttonClass } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Primitives'
import { GlassPanel } from '../../components/layout/GlassPanel'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../features/auth/AuthProvider'
import { useUnreadQuery } from '../../features/notifications/notifications.queries'
import { DESKTOP_KEYS, DESTINATIONS } from './nav-items'

type TopBarProps = {
  onOpenMenu: () => void
}

/** 顶栏：品牌、搜索入口、六个目的地（桌面）、通知、主题切换、当前会话入口。 */
export function TopBar({ onOpenMenu }: TopBarProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, loading, logout } = useAuth()
  const { data: unread } = useUnreadQuery(!!user)
  const unreadCount = unread ?? 0
  const create = DESTINATIONS.create!
  const CreateIcon = create.icon

  return (
    <header className="sticky top-0 z-30">
    <GlassPanel className="flex h-14 items-center gap-3 rounded-none border-x-0 border-t-0 px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="打开导航菜单"
        className={buttonClass('ghost', 'sm', 'lg:hidden')}
      >
        <Menu size={19} />
      </button>

      <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="星聚 STARPAL 首页">
        <StarpalMark size={26} decorative />
        <span className="text-sm font-semibold tracking-wide text-ink">
          星聚
          {/* 窄屏只保留中文两字，为右侧操作区让出宽度；sm 以上再补副标。 */}
          <span className="ml-2 hidden font-normal text-faint sm:inline">STARPAL</span>
        </span>
      </Link>

      <nav aria-label="主导航" className="ml-4 hidden items-center gap-0.5 lg:flex">
        {DESKTOP_KEYS.filter((key) => key !== 'create' && key !== 'notifications').map((key) => {
          const item = DESTINATIONS[key]!
          return (
            <NavLink
              key={key}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                buttonClass('ghost', 'sm', isActive ? 'bg-subtle text-ink' : '')
              }
            >
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <Link to="/search" className={buttonClass('ghost', 'sm', 'hidden sm:inline-flex')} aria-label="搜索">
          <Search size={17} />
        </Link>
        <Link
          to="/notifications"
          className={`${buttonClass('ghost', 'sm')} relative`}
          aria-label={unreadCount > 0 ? `通知（${unreadCount} 条未读）` : '通知'}
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sp-danger)] px-1 text-[10px] font-semibold leading-none text-on-accent">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? '切换到深色主题' : '切换到浅色主题'}
          className={buttonClass('ghost', 'sm')}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <Link to={create.path} className={buttonClass('primary', 'sm', 'hidden lg:inline-flex')}>
          <CreateIcon size={15} /> 发布
        </Link>
        {loading ? (
          <span className="sp-skeleton h-8 w-24 rounded-sm" aria-hidden="true" />
        ) : user ? (
          <>
            <span className="hidden items-center gap-2 sm:inline-flex">
              <Avatar name={user.displayName} src={user.avatarUrl} size={24} />
              <span className="max-w-[8rem] truncate text-sm text-ink">{user.displayName}</span>
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              aria-label={`退出登录，当前账号 ${user.displayName}`}
              className={buttonClass('secondary', 'sm')}
            >
              退出
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={buttonClass('secondary', 'sm', 'hidden sm:inline-flex')}>
              登录
            </Link>
            <Link to="/register" className={buttonClass('primary', 'sm')}>
              注册
            </Link>
          </>
        )}
      </div>
    </GlassPanel>
    </header>
  )
}
