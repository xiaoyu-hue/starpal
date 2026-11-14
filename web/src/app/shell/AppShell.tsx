// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type ReactNode } from 'react'
import { BottomTabBar } from './BottomTabBar'
import { MobileMenu } from './MobileMenu'
import { RightRail } from './RightRail'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/**
 * 应用外壳：1280 / 1024 / 768 三档折叠。
 * ≥1280 三栏；1024–1279 隐藏右栏；768–1023 隐藏两栏、启用抽屉；<768 启用底部 Tab。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-canvas">
      <TopBar onOpenMenu={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 pb-24 pt-5 md:px-6 md:pb-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <main id="main-content" className="min-w-0">
          {children}
        </main>

        <div className="hidden xl:block">
          <RightRail />
        </div>
      </div>

      <BottomTabBar />
    </div>
  )
}
