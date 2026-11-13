import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { DESTINATIONS, MOBILE_TAB_KEYS } from './nav-items'

/** 移动端底部 Tab：四项 + 中央凸起发布按钮，触摸目标 ≥48px，含安全区内边距。 */
export function BottomTabBar() {
  const left = MOBILE_TAB_KEYS.slice(0, 2)
  const right = MOBILE_TAB_KEYS.slice(2)
  const create = DESTINATIONS.create!

  return (
    <nav
      aria-label="移动端主导航"
      className="sp-glass fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {left.map((key) => <TabItem key={key} itemKey={key} />)}

        <NavLink
          to={create.path}
          aria-label="发布内容"
          className="sp-transition -mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-md hover:bg-accent-hover"
        >
          <create.icon size={24} />
        </NavLink>

        {right.map((key) => <TabItem key={key} itemKey={key} />)}
      </div>
    </nav>
  )
}

function TabItem({ itemKey }: { itemKey: string }) {
  const item = DESTINATIONS[itemKey]!
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex h-12 min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-sm text-xs',
          isActive ? 'text-accent' : 'text-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={20} aria-hidden="true" />
          <span aria-current={isActive ? 'page' : undefined}>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}
