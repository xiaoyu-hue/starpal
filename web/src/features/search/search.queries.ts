// SPDX-License-Identifier: AGPL-3.0-or-later
import { useInfiniteQuery } from '@tanstack/react-query'
import type { FeedPage } from '../../types/api'
import { fetchSearch, type SearchType } from './search.api'

/** 搜索是纯域内查询，键留在域内，不进 lib/query-keys 的跨域根键。 */
const searchKeys = {
  all: ['search'] as const,
  list: (q: string, type: SearchType) => ['search', 'list', q, type] as const,
}

/**
 * 搜索结果：游标分页与信息流同构。
 * 关键词为空时 `enabled: false`，不发请求——页面据此直接展示初始空态。
 */
export function useSearchQuery(q: string, type: SearchType) {
  return useInfiniteQuery({
    queryKey: searchKeys.list(q, type),
    queryFn: ({ pageParam, signal }) =>
      fetchSearch({ q, type, cursor: pageParam ?? undefined }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: q.length > 0,
  })
}
