// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { bookmarkKeys, feedKeys, postKeys } from '../../lib/query-keys'
import type { FeedPage, PostDetail } from '../../types/api'
import { fetchBookmarks, setBookmark } from './bookmarks.api'

/** 收藏列表：本人私有，游标分页与信息流同构。 */
export function useBookmarksQuery() {
  return useInfiniteQuery({
    queryKey: bookmarkKeys.list,
    queryFn: ({ pageParam, signal }) => fetchBookmarks(pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  })
}

/** 就地更新信息流各页里同一帖子的收藏态，避免为一次点击重取整页、打断滚动。 */
function patchFeedLists(client: QueryClient, id: number, on: boolean, count?: number) {
  client.setQueriesData<InfiniteData<FeedPage>>({ queryKey: feedKeys.all }, (data) => {
    if (!data) return data
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) =>
          item.id === id
            ? {
                ...item,
                isBookmarked: on,
                bookmarkCount: count ?? Math.max(item.bookmarkCount + (on ? 1 : -1), 0),
              }
            : item,
        ),
      })),
    }
  })
}

/**
 * 收藏开关：乐观更新详情页与信息流，失败回滚，成功以服务端返回的计数为准。
 *
 * 与点赞不同的取舍：收藏不改变信息流排序（热门按净赞、推荐按话题+新鲜度+热度），
 * 所以就地校正列表项即可，不整页失效重取；收藏列表则按「收藏时间」排序，
 * 新增/移除都会改变分页顺序，必须失效重取，不能本地插一条猜出来的位置。
 */
export function useBookmarkMutation(id: number) {
  const client = useQueryClient()
  const detailKey = postKeys.detail(id)
  return useMutation({
    mutationFn: (on: boolean) => setBookmark(id, on),
    onMutate: async (on: boolean) => {
      await client.cancelQueries({ queryKey: detailKey })
      const previous = client.getQueryData<PostDetail>(detailKey)
      if (previous) {
        client.setQueryData<PostDetail>(detailKey, {
          ...previous,
          isBookmarked: on,
          bookmarkCount: Math.max(previous.bookmarkCount + (on ? 1 : -1), 0),
        })
      }
      patchFeedLists(client, id, on)
      return { previous }
    },
    onError: (_error, _on, context) => {
      if (context?.previous) client.setQueryData(detailKey, context.previous)
      void client.invalidateQueries({ queryKey: feedKeys.all })
      void client.invalidateQueries({ queryKey: bookmarkKeys.all })
    },
    onSuccess: (state) => {
      client.setQueryData<PostDetail>(detailKey, (prev) =>
        prev
          ? { ...prev, isBookmarked: state.bookmarked, bookmarkCount: state.bookmarkCount }
          : prev,
      )
      patchFeedLists(client, id, state.bookmarked, state.bookmarkCount)
      void client.invalidateQueries({ queryKey: bookmarkKeys.all })
    },
  })
}
