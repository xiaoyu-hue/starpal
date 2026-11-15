// SPDX-License-Identifier: AGPL-3.0-or-later
import { useQuery } from '@tanstack/react-query'
import { fetchLevel } from './level.api'

/** 查询键留在域内（与 achievements / search 同一处理），不进跨域根键。 */
const levelKeys = {
  all: ['levels'] as const,
  one: (username: string) => ['levels', username] as const,
}

/**
 * 某人等级。
 *
 * 设 60 秒 staleTime：等级由累计经验派生，一分钟内不会变；
 * 而这个接口每次调用都可能触发一次「晋级落库」，没有必要在页面间来回切时反复打。
 * 不设更长的缓存，是为了让刚升级的人刷新就能看到新等级。
 */
export function useLevelQuery(username: string) {
  return useQuery({
    queryKey: levelKeys.one(username),
    queryFn: ({ signal }) => fetchLevel(username, signal),
    enabled: username.length > 0,
    staleTime: 60_000,
  })
}
