import { apiGet } from '../../lib/api-client'
import type { FeedPage, FeedPost, FeedTab } from '../../types/api'

export type FeedQueryParams = {
  tab: FeedTab
  cursor?: string
  limit?: number
}

/** 信息流请求：仅描述路径与参数，传输逻辑由 api-client 统一承担。 */
export async function fetchFeed(
  params: FeedQueryParams,
  signal?: AbortSignal,
): Promise<FeedPage> {
  const envelope = await apiGet<FeedPost[]>('posts', {
    signal,
    params: { tab: params.tab, cursor: params.cursor, limit: params.limit },
  })
  const meta = envelope.meta ?? {}
  const value = meta as { nextCursor?: unknown; hasMore?: unknown }
  return {
    items: envelope.data,
    nextCursor: typeof value.nextCursor === 'string' ? value.nextCursor : null,
    hasMore: value.hasMore === true,
  }
}
