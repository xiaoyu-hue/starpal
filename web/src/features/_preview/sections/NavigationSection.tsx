// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Compass,
  Hash,
  Home,
  MessageCircle,
  PenLine,
  Search,
  User,
} from 'lucide-react'
import { GlassPanel } from '../../../components/layout/GlassPanel'

const DESKTOP_ITEMS = ['首页', '发现', '话题', '发布', '通知', '我的']

const MOBILE_ITEMS = [
  { label: '首页', icon: Home, primary: false },
  { label: '发现', icon: Compass, primary: false },
  { label: '发布', icon: PenLine, primary: true },
  { label: '私信', icon: MessageCircle, primary: false },
  { label: '我的', icon: User, primary: false },
]

export function NavigationSection() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-medium text-faint">
          桌面顶栏 · 玻璃层 · 六个目的地（≥1280px 三栏布局）
        </p>
        <GlassPanel className="flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-2 text-sm font-semibold text-accent">SP</span>
          {DESKTOP_ITEMS.map((item) => (
            <span key={item} className="rounded-sm px-2 py-1 text-sm text-muted">
              {item}
            </span>
          ))}
          <span className="ml-auto hidden items-center gap-2 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs text-faint sm:inline-flex">
            <Search size={14} />
            搜索
          </span>
        </GlassPanel>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium text-faint">
          移动端底部 Tab · 四项 + 中央凸起发布（≤768px）
        </p>
        <GlassPanel className="mx-auto flex max-w-[360px] items-end justify-around px-2 py-2">
          {MOBILE_ITEMS.map((item) => {
            const Icon = item.icon
            if (item.primary) {
              return (
                <span
                  key={item.label}
                  className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-md"
                  aria-label={item.label}
                >
                  <Icon size={20} />
                </span>
              )
            }
            return (
              <span
                key={item.label}
                className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 text-[11px] text-muted"
              >
                <Icon size={18} />
                {item.label}
              </span>
            )
          })}
        </GlassPanel>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        目的地集合在桌面与移动端一致；话题在移动端并入「发现」，通知以顶栏图标 + 我的页入口呈现。
        此处为排版示意，真实导航与路由在 M1 剩余阶段接入。
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-xs text-faint">
          <Hash size={13} />
          话题分类（左栏）
        </span>
        <span className="rounded-sm border border-line px-2 py-1 text-xs text-faint">
          触摸目标 ≥ 48px
        </span>
        <span className="rounded-sm border border-line px-2 py-1 text-xs text-faint">
          断点 1280 / 1024 / 768
        </span>
      </div>
    </div>
  )
}
