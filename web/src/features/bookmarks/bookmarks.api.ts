// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiDelete, apiGet, apiPut } from '../../lib/api-client'
import type { FeedPage, FeedPost } from '../../types/api'

/** 收藏列表（仅本人）：与信息流同一包络形状，data 为列表、meta 承载游标。 */
export async function fetchBookmarks(
  cursor?: string,
  signal?: AbortSignal,
): Promise<FeedPage> {
  const envelope = await apiGet<FeedPost[]>('users/me/bookmarks', {
    signal,
    params: { cursor },
  })
  const meta = (envelope.meta ?? {}) as { nextCursor?: unknown; hasMore?: unknown }
  return {
    items: envelope.data,
    nextCursor: typeof meta.nextCursor === 'string' ? meta.nextCursor : null,
    hasMore: meta.hasMore === true,
  }
}

/** 收藏开关：PUT 建立、DELETE 撤销，均为幂等（与点赞同一约定）。 */
export async function setBookmark(
  id: number,
  on: boolean,
): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  type State = { bookmarked: boolean; bookmarkCount: number }
  const envelope = on
    ? await apiPut<State>(`posts/${id}/bookmark`)
    : await apiDelete<State>(`posts/${id}/bookmark`)
  return envelope.data
}
