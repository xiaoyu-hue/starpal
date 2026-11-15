// SPDX-License-Identifier: AGPL-3.0-or-later
import { useQuery } from '@tanstack/react-query'
import { fetchWeekly } from './discover.api'

/** 查询键留在域内，不进 lib/query-keys 的跨域根键（与 search、achievements 同一处理）。 */
const discoverKeys = {
  weekly: () => ['achievements', 'weekly'] as const,
}

/** 本周热门：一周内变化有限，给 5 分钟缓存，减少重复请求。 */
export function useWeeklyQuery() {
  return useQuery({
    queryKey: discoverKeys.weekly(),
    queryFn: ({ signal }) => fetchWeekly(signal),
    staleTime: 5 * 60 * 1000,
  })
}
