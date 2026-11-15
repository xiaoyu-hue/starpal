// SPDX-License-Identifier: AGPL-3.0-or-later
import { useQuery } from '@tanstack/react-query'
import { fetchTimeline, fetchWeekly } from './achievements.api'

/** 查询键留在域内，不进 lib/query-keys 的跨域根键（与 search 同一处理）。 */
const achievementKeys = {
  all: ['achievements'] as const,
  timeline: (username: string) => ['achievements', 'timeline', username] as const,
  weekly: () => ['achievements', 'weekly'] as const,
}

/**
 * 某人成就：不设 staleTime——判定结果依赖实时统计，
 * 缓存太久会让刚发的帖子迟迟不解锁徽章。
 */
export function useTimelineQuery(username: string) {
  return useQuery({
    queryKey: achievementKeys.timeline(username),
    queryFn: ({ signal }) => fetchTimeline(username, signal),
    enabled: username.length > 0,
  })
}

/** 本周热门：一周内变化有限，给 5 分钟缓存，减少重复请求。 */
export function useWeeklyQuery() {
  return useQuery({
    queryKey: achievementKeys.weekly(),
    queryFn: ({ signal }) => fetchWeekly(signal),
    staleTime: 5 * 60 * 1000,
  })
}
