import { useQuery } from '@tanstack/react-query'
import { fetchTopics } from './api'

/** 话题目录缓存键：目录变动极少，与帖子流分开，避免发帖后整表重取。 */
export const topicKeys = {
  all: ['topics'] as const,
  list: () => ['topics', 'list'] as const,
}

export function useTopicsQuery() {
  return useQuery({
    queryKey: topicKeys.list(),
    queryFn: ({ signal }) => fetchTopics(signal),
    staleTime: 5 * 60_000,
  })
}
