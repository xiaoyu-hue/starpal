// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from '../../lib/cn'
import type { AchievementItem } from '../../types/api'
import { AchievementSeal } from './achievement.seals'

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
        <AchievementSeal code={item.code} size={18} />
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
