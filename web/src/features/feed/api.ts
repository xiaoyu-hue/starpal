import { apiGet } from '../../lib/api-client'
import type { FeedPage, FeedPost, FeedTab } from '../../types/api'

export type FeedQueryParams = {
  tab: FeedTab
  cursor?: string
  limit?: number
  /** 话题 slug：服务端在同一条查询里完成筛选，筛选后的可见性与排序规则不变。 */
  topic?: string
}

/** 信息流请求：仅描述路径与参数，传输逻辑由 api-client 统一承担。 */
export async function fetchFeed(
  params: FeedQueryParams,
  signal?: AbortSignal,
): Promise<FeedPage> {
  const envelope = await apiGet<FeedPost[]>('posts', {
    signal,
    params: {
      tab: params.tab,
      cursor: params.cursor,
      limit: params.limit,
      topic: params.topic,
    },
  })
  const meta = envelope.meta ?? {}
  const value = meta as { nextCursor?: unknown; hasMore?: unknown }
  return {
    items: envelope.data,
    nextCursor: typeof value.nextCursor === 'string' ? value.nextCursor : null,
    hasMore: value.hasMore === true,
  }
}
