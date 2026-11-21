// SPDX-License-Identifier: AGPL-3.0-or-later
import { AnimatePresence, m } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { SP_DURATION, SP_EASE } from '../../lib/motion'
import { BottomTabBar } from './BottomTabBar'
import { MobileMenu } from './MobileMenu'
import { RightRail } from './RightRail'
import { Sidebar } from './Sidebar'
import { SiteFooter } from './SiteFooter'
import { TopBar } from './TopBar'

/**
 * 应用外壳：1280 / 1024 / 768 三档折叠。
 * ≥1280 三栏；1024–1279 隐藏右栏；768–1023 隐藏两栏、启用抽屉；<768 启用底部 Tab。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-canvas">
      <TopBar onOpenMenu={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 pb-2 pt-5 md:px-6 md:pb-2 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <main id="main-content" className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: SP_DURATION, ease: SP_EASE }}
            >
              {children}
            </m.div>
          </AnimatePresence>
        </main>

        <div className="hidden xl:block">
          <RightRail />
        </div>
      </div>

      <SiteFooter />
      <BottomTabBar />
    </div>
  )
}
