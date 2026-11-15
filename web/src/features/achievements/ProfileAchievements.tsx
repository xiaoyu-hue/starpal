// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link } from 'react-router-dom'
import { achievementIcon } from './AchievementCard'
import { useTimelineQuery } from './achievements.queries'

/** 资料页最多显示几枚徽章：一行内可读，多了会把主页挤成荣誉墙。 */
const PROFILE_BADGES_MAX = 6

/**
 * 资料页成就区块。
 *
 * 三条约束：
 * 1. 查询失败时整块静默不渲染——徽章是附加信息，不该让主页报错；
 * 2. 旁观者看到空成就时整块隐藏，避免"这人什么都没有"的负面暗示；
 * 3. 本人看到空成就时给一条入口提示，否则这个页面在站内没有可发现的路径。
 */
export function ProfileAchievements({
  username,
  isSelf,
}: {
  username: string
  isSelf: boolean
}) {
  const query = useTimelineQuery(username)

  if (query.isPending) {
    return <div className="sp-skeleton h-16 w-full rounded-md" aria-hidden="true" />
  }
  if (query.isError) return null

  const { items, unlockedCount, totalCount } = query.data
  const unlocked = items.filter((item) => item.unlockedAt !== null)
  const href = `/achievements?u=${encodeURIComponent(username)}`

  if (unlocked.length === 0) {
    if (!isSelf) return null
    return (
      <section aria-labelledby="profile-achievements-heading">
        <h2 id="profile-achievements-heading" className="mb-2 text-sm font-medium text-muted">
          成就
        </h2>
        <div className="sp-card px-4 py-3">
          <p className="text-sm text-muted">
            还没有解锁任何成就。发帖、评论、私信都会留下记录。
          </p>
          <Link to={href} className="mt-1 inline-block text-sm text-accent">
            查看全部 {totalCount} 项成就
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="profile-achievements-heading">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 id="profile-achievements-heading" className="text-sm font-medium text-muted">
          成就
        </h2>
        <Link to={href} className="text-xs text-accent">
          {unlockedCount} / {totalCount} · 全部
        </Link>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {unlocked.slice(0, PROFILE_BADGES_MAX).map((item) => {
          const Icon = achievementIcon(item.icon)
          return (
            <li
              key={item.code}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
              style={{
                color: 'var(--sp-achievement)',
                borderColor: 'var(--sp-achievement)',
                background: 'var(--sp-achievement-soft)',
              }}
              title={item.description}
            >
              <Icon size={13} aria-hidden="true" />
              {item.nameZh}
            </li>
          )
        })}
        {unlocked.length > PROFILE_BADGES_MAX && (
          <li className="inline-flex items-center px-1 text-xs text-faint">
            还有 {unlocked.length - PROFILE_BADGES_MAX} 枚
          </li>
        )}
      </ul>
    </section>
  )
}
