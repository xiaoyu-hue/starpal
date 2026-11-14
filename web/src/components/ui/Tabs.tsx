// SPDX-License-Identifier: AGPL-3.0-or-later
import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

export type TabItem = { value: string; label: string; content: ReactNode }

type TabGroupProps = {
  tabs: TabItem[]
  defaultValue?: string
  ariaLabel?: string
}

/** 标签页：方向键、Home/End 导航由 Radix 提供。 */
export function TabGroup({ tabs, defaultValue, ariaLabel = '内容分组' }: TabGroupProps) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue ?? tabs[0]?.value}>
      <TabsPrimitive.List
        className="inline-flex gap-1 rounded-md border border-line bg-subtle p-1"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="sp-transition rounded-sm px-4 py-1.5 text-sm text-muted data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.value} value={tab.value} className="mt-4 text-sm text-muted">
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}
