// SPDX-License-Identifier: AGPL-3.0-or-later
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchOwnProfile,
  fetchPublicProfile,
  fetchUserPosts,
} from './api'

/** 缓存键按域命名；用户名作为路径参数纳入键，避免跨用户串数据。 */
export const profileKeys = {
  public: (username: string) => ['profile', 'public', username] as const,
  posts: (username: string) => ['profile', 'posts', username] as const,
  /** 帖子写入后按前缀整体失效，无需逐个用户名列举。 */
  postsAll: () => ['profile', 'posts'] as const,
  own: () => ['profile', 'own'] as const,
}

export function usePublicProfileQuery(username: string) {
  return useQuery({
    queryKey: profileKeys.public(username),
    queryFn: ({ signal }) => fetchPublicProfile(username),
    enabled: Boolean(username),
  })
}

/** 个人页帖子：与主信息流同一游标规则，滚动到底继续取。 */
export function useUserPostsQuery(username: string) {
  return useInfiniteQuery({
    queryKey: profileKeys.posts(username),
    queryFn: ({ pageParam, signal }) => fetchUserPosts(username, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: Boolean(username),
  })
}

export function useOwnProfileQuery() {
  return useQuery({
    queryKey: profileKeys.own(),
    queryFn: () => fetchOwnProfile(),
  })
}
