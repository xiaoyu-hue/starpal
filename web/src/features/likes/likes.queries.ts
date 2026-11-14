// SPDX-License-Identifier: AGPL-3.0-or-later
import { useInfiniteQuery } from '@tanstack/react-query'
import { likeKeys } from '../../lib/query-keys'
import type { FeedPage } from '../../types/api'
import { fetchLikes } from './likes.api'

/**
 * 点赞列表：本人私有，游标分页与信息流同构。
 *
 * 写入不在此模块：点赞开关沿用 posts 域的 useLikeMutation（详情页唯一写入口），
 * 它在 onSettled 里同时失效 feedKeys 与 likeKeys——
 * 前者因为点赞改变热门排序，后者因为点赞列表按「点赞时间」排序，
 * 新增/移除都会改变分页顺序，必须重取而不能本地猜位置。
 */
export function useLikesQuery() {
  return useInfiniteQuery({
    queryKey: likeKeys.list,
    queryFn: ({ pageParam, signal }) => fetchLikes(pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  })
}
