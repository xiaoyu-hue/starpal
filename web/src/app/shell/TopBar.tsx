import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { StarpalMark } from '../../components/brand/StarpalLogo'
import { buttonClass } from '../../components/ui/Button'
import { GlassPanel } from '../../components/layout/GlassPanel'
import { useTheme } from '../../hooks/useTheme'
import { DESKTOP_KEYS, DESTINATIONS } from './nav-items'

type TopBarProps = {
  onOpenMenu: () => void
}

/** 顶栏：品牌、搜索入口、六个目的地（桌面）、通知、主题切换、访客入口。 */
export function TopBar({ onOpenMenu }: TopBarProps) {
  const { theme, toggleTheme } = useTheme()
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
        <span className="hidden text-sm font-semibold tracking-wide text-ink sm:inline">
          星聚 <span className="font-normal text-faint">STARPAL</span>
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
        <Link to="/notifications" className={buttonClass('ghost', 'sm')} aria-label="通知">
          <Bell size={17} />
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
        <Link to="/login" className={buttonClass('secondary', 'sm', 'hidden sm:inline-flex')}>
          登录
        </Link>
        <Link to="/register" className={buttonClass('primary', 'sm')}>
          注册
        </Link>
      </div>
    </GlassPanel>
    </header>
  )
}
