// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet } from '../../lib/api-client'
import type { FeedPage, FeedPost } from '../../types/api'

/** 检索范围：all=标题/正文/话题名，post=标题/正文，topic=话题名。 */
export type SearchType = 'all' | 'post' | 'topic'

/**
 * 搜索（匿名可用）：与信息流同一包络形状，data 为帖子列表、meta 承载游标。
 * 服务端沿用信息流可见性口径，前端无需再过滤。
 */
export async function fetchSearch(
  params: { q: string; type: SearchType; cursor?: string },
  signal?: AbortSignal,
): Promise<FeedPage> {
  const envelope = await apiGet<FeedPost[]>('search', {
    signal,
    params: { q: params.q, type: params.type, cursor: params.cursor },
  })
  const meta = (envelope.meta ?? {}) as { nextCursor?: unknown; hasMore?: unknown }
  return {
    items: envelope.data,
    nextCursor: typeof meta.nextCursor === 'string' ? meta.nextCursor : null,
    hasMore: meta.hasMore === true,
  }
}
