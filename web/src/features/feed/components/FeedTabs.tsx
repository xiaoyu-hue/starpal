import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { FeedTab } from '../../../types/api'

const TABS: { value: FeedTab; label: string }[] = [
  { value: 'recommended', label: '推荐' },
  { value: 'latest', label: '最新' },
  { value: 'popular', label: '热门' },
]

type FeedTabsProps = {
  value: FeedTab
  onChange: (tab: FeedTab) => void
}

/** 三个 Tab：方向键与 Home/End 由 Radix 提供，切换改变查询键。 */
export function FeedTabs({ value, onChange }: FeedTabsProps) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={(next) => onChange(next as FeedTab)}>
      <TabsPrimitive.List
        aria-label="信息流排序"
        className="inline-flex gap-1 rounded-md border border-line bg-subtle p-1"
      >
        {TABS.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="sp-transition rounded-sm px-4 py-1.5 text-sm text-muted data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  )
}
