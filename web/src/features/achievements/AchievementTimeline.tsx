// SPDX-License-Identifier: AGPL-3.0-or-later
import type { AchievementTimeline as Timeline } from '../../types/api'
import { AchievementCard } from './AchievementCard'

/**
 * 成就时间线：已解锁按解锁时间倒序（最近的在最上），未解锁按目录顺序排在其后。
 * 两块之间不做"进度条"或"下一个目标"提示——只陈述事实，不制造追赶压力。
 */
export function AchievementTimeline({ timeline }: { timeline: Timeline }) {
  const unlocked = timeline.items.filter((item) => item.unlockedAt !== null)
  const locked = timeline.items.filter((item) => item.unlockedAt === null)

  return (
    <div className="space-y-4">
      <section aria-labelledby="unlocked-heading">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 id="unlocked-heading" className="text-sm font-semibold text-ink">
            已解锁
          </h2>
          <span className="text-xs text-faint">
            {timeline.unlockedCount} / {timeline.totalCount}
          </span>
        </div>
        {unlocked.length > 0 ? (
          <div className="space-y-2">
            {unlocked.map((item) => (
              <AchievementCard key={item.code} item={item} />
            ))}
          </div>
        ) : (
          <div className="sp-card px-5 py-8 text-center">
            <p className="text-sm text-muted">
              还没有解锁任何成就。发一篇帖子、留一条评论，或者给同好发句私信，都会留下记录。
            </p>
          </div>
        )}
      </section>

      {locked.length > 0 && (
        <section aria-labelledby="locked-heading">
          <h2 id="locked-heading" className="mb-2 text-sm font-semibold text-ink">
            还可以解锁
          </h2>
          <div className="space-y-2">
            {locked.map((item) => (
              <AchievementCard key={item.code} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
