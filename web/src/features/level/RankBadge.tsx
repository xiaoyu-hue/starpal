// SPDX-License-Identifier: AGPL-3.0-or-later
import { useLevelQuery } from './level.queries'

/**
 * 名字旁的段位徽标（M5.5 补充）。
 *
 * 与头衔徽标（`TitleBadges`）在视觉上刻意分开：
 * - **头衔是描边**（透明底 + 同色字），表示「这个人能做什么」；
 * - **段位是实填**（浅色底 + 同色字），表示「这个人来了多久」。
 *
 * 两者颜色也分离（头衔金 / 紫 / 青，段位石板灰蓝），即使并排也不会被误读成同一种东西。
 *
 * 只在**公开个人主页**使用，不进帖子与评论署名行——署名行挂段位等于给整个社区排名，
 * 越界到 `FR-ACH-04` 的克制边界。没戴段位时返回 null，不占位。
 */
export function ProfileRankBadge({ username, className }: { username: string; className?: string }) {
  const { data } = useLevelQuery(username)
  const badge = data?.badge
  if (!badge) return null

  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
      style={{ color: 'var(--sp-level)', backgroundColor: 'var(--sp-level-soft)' }}
      title="段位：按等级到过的区间佩戴，可在设置里更换或隐藏"
    >
      {badge.nameZh}
    </span>
  )
}
