// SPDX-License-Identifier: AGPL-3.0-or-later
import { useQuery } from '@tanstack/react-query'
import { fetchTimeline } from './achievements.api'

/** 查询键留在域内，不进 lib/query-keys 的跨域根键（与 search 同一处理）。 */
const achievementKeys = {
  all: ['achievements'] as const,
  timeline: (username: string) => ['achievements', 'timeline', username] as const,
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
