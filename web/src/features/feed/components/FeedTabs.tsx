// SPDX-License-Identifier: AGPL-3.0-or-later
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

/**
 * 信息流排序切换。
 *
 * 这里不是「切换内容面板」：三个选项改变的是同一个信息流的查询条件，
 * 内容由页面统一渲染。原先借 Radix Tabs 的 Trigger 做样式，会生成指向
 * 不存在的 Content 的 aria-controls（axe: aria-valid-attr-value, critical）。
 * 改用按钮组 + aria-pressed，语义与行为一致：选中态对辅助技术可读，
 * Tab / Shift+Tab / Enter / Space 都是按钮的原生键盘行为，不另造交互模型。
 */
export function FeedTabs({ value, onChange }: FeedTabsProps) {
  return (
    <div
      role="group"
      aria-label="信息流排序"
      className="inline-flex gap-1 rounded-md border border-line bg-subtle p-1"
    >
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={value === tab.value}
          onClick={() => onChange(tab.value)}
          className="sp-transition rounded-sm px-4 py-1.5 text-sm text-muted aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
