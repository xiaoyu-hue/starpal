import { useInfiniteQuery } from '@tanstack/react-query'
import type { FeedTab } from '../../types/api'
import { fetchFeed } from './api'

/** 缓存键按域命名；pageParam 为游标，保证同一 Tab 只有一条在途链。 */
export const feedKeys = {
  all: ['feed'] as const,
  list: (tab: FeedTab) => ['feed', 'list', tab] as const,
}

export function useFeedQuery(tab: FeedTab) {
  return useInfiniteQuery({
    queryKey: feedKeys.list(tab),
    queryFn: ({ pageParam, signal }) =>
      fetchFeed({ tab, cursor: pageParam ?? undefined }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  })
}
