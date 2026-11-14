// SPDX-License-Identifier: AGPL-3.0-or-later
import { useInfiniteQuery } from '@tanstack/react-query'
import { feedKeys } from '../../lib/query-keys'
import type { FeedTab } from '../../types/api'
import { fetchFeed } from './api'

/** 缓存键定义在 lib/query-keys；此处重新导出，保持 feed 公共出口路径不变。 */
export { feedKeys }

/**
 * 缓存键按域命名；pageParam 为游标，保证同一 Tab 只有一条在途链。
 * 话题作为筛选维度进入键：切换话题必须换一条缓存链，否则会串数据。
 */
export function useFeedQuery(tab: FeedTab, topic?: string) {
  return useInfiniteQuery({
    queryKey: feedKeys.list(tab, topic),
    queryFn: ({ pageParam, signal }) =>
      fetchFeed({ tab, topic, cursor: pageParam ?? undefined }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  })
}
