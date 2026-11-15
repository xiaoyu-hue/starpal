// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Award,
  Calendar,
  Compass,
  Heart,
  Layers,
  MessageCircle,
  PenLine,
  Send,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { AchievementItem } from '../../types/api'

/**
 * 图标白名单：服务端只存键名，前端按此映射到组件。
 * 不放行任意字符串是刻意的——数据进渲染层时只有一个确定集合，未知键走 Award 兜底。
 */
const ICONS: Record<string, LucideIcon> = {
  'pen-line': PenLine,
  'message-circle': MessageCircle,
  compass: Compass,
  layers: Layers,
  heart: Heart,
  sparkles: Sparkles,
  send: Send,
  'user-plus': UserPlus,
  calendar: Calendar,
}

/** 供资料页等紧凑展示复用同一套映射，避免两处各写一份图标表导致键名漂移。 */
export function achievementIcon(key: string): LucideIcon {
  return ICONS[key] ?? Award
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * 单条成就卡片。
 * 未解锁用虚线边框 + 降透明度，且**不显示进度百分比或「还差几个」**——
 * 精确进度会变成催促式追踪，越界到 PRD `FR-ACH-04` 要避免的成瘾设计。
 */
export function AchievementCard({ item }: { item: AchievementItem }) {
  const Icon = achievementIcon(item.icon)
  const unlocked = item.unlockedAt !== null

  return (
    <article
      className={cn(
        'sp-transition flex gap-3 rounded-md border p-4',
        unlocked ? 'border-line bg-surface' : 'border-dashed border-line',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          unlocked ? '' : 'text-faint',
        )}
        style={
          unlocked
            ? {
                background: 'var(--sp-achievement-soft)',
                color: 'var(--sp-achievement)',
              }
            : undefined
        }
      >
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className={cn('text-sm font-semibold', unlocked ? 'text-ink' : 'text-muted')}>
            {item.nameZh}
          </h3>
          {unlocked && item.unlockedAt ? (
            <span className="text-xs text-faint">解锁于 {formatDay(item.unlockedAt)}</span>
          ) : (
            <span className="text-xs text-faint">未解锁</span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{item.description}</p>
        <p className="mt-0.5 text-xs text-faint">条件：{item.goal}</p>
      </div>
    </article>
  )
}
