// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet } from '../../lib/api-client'
import type { AchievementTimeline, WeeklyPopular } from '../../types/api'

/**
 * 成就时间线（匿名可读）：服务端在读取时顺手补写新达标的解锁记录，
 * 所以这个 GET 会带来次生写入——是「读时判定」方案的既有行为，不是缓存穿透。
 */
export async function fetchTimeline(
  username: string,
  signal?: AbortSignal,
): Promise<AchievementTimeline> {
  const envelope = await apiGet<AchievementTimeline>(
    `achievements/${encodeURIComponent(username)}`,
    { signal },
  )
  return envelope.data
}

/** 本周热门：只读聚合，最多 5 条。 */
export async function fetchWeekly(signal?: AbortSignal): Promise<WeeklyPopular> {
  const envelope = await apiGet<WeeklyPopular>('achievements/weekly', { signal })
  return envelope.data
}
