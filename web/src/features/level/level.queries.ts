// SPDX-License-Identifier: AGPL-3.0-or-later
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLevel, setMyRank } from './level.api'
import type { RankKey } from '../../types/level'

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

/**
 * 换段位徽标。
 *
 * 成功后把该用户的等级查询标记为失效：徽标挂在同一份视图里，
 * 不刷新就会出现「选完了但还是旧徽标」。用 invalidate 而不是本地改缓存，
 * 是因为服务端还会校验解锁并可能拒绝，以服务端结果为准。
 */
export function useSetRankMutation(username: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rank: RankKey | null) => setMyRank(rank),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: levelKeys.one(username) }),
  })
}
