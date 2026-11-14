// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet } from '../../lib/api-client'
import type { FeedPage, FeedPost } from '../../types/api'

/**
 * 点赞列表（仅本人）：与信息流同一包络形状，data 为列表、meta 承载游标。
 *
 * 这里只放「读」。点赞的写入沿用 posts 域的 setPostLike / useLikeMutation
 * （详情页是唯一写入口），不经本模块转发，避免点赞列表反向依赖 posts 的重型入口。
 * 两侧通过 lib/query-keys 的 likeKeys 协作失效，见 likes.queries.ts 说明。
 */
export async function fetchLikes(
  cursor?: string,
  signal?: AbortSignal,
): Promise<FeedPage> {
  const envelope = await apiGet<FeedPost[]>('users/me/likes', {
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
