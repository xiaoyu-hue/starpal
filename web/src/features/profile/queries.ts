import { useQuery } from '@tanstack/react-query'
import {
  fetchOwnProfile,
  fetchPublicProfile,
  fetchUserPosts,
} from './api'

/** 缓存键按域命名；用户名作为路径参数纳入键，避免跨用户串数据。 */
export const profileKeys = {
  public: (username: string) => ['profile', 'public', username] as const,
  posts: (username: string) => ['profile', 'posts', username] as const,
  own: () => ['profile', 'own'] as const,
}

export function usePublicProfileQuery(username: string) {
  return useQuery({
    queryKey: profileKeys.public(username),
    queryFn: ({ signal }) => fetchPublicProfile(username),
    enabled: Boolean(username),
  })
}

export function useUserPostsQuery(username: string) {
  return useQuery({
    queryKey: profileKeys.posts(username),
    queryFn: ({ signal }) => fetchUserPosts(username),
    enabled: Boolean(username),
  })
}

export function useOwnProfileQuery() {
  return useQuery({
    queryKey: profileKeys.own(),
    queryFn: () => fetchOwnProfile(),
  })
}
