/** 服务端统一响应契约，与 ARCHITECTURE.md §5.6 一致。 */
export type PageMeta = {
  nextCursor: string | null
  hasMore: boolean
}

export type ApiEnvelope<T> = {
  data: T
  meta?: PageMeta | Record<string, unknown>
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: { field: string; constraint: string }[]
    requestId: string
  }
}

export type FeedTab = 'recommended' | 'latest' | 'popular'

export type FeedPost = {
  id: number
  title: string
  excerpt: string
  topic: { slug: string; nameZh: string }
  author: { username: string; avatarUrl: string | null }
  likeCount: number
  commentCount: number
  images: string[]
  createdAt: string
}

export type FeedPage = {
  items: FeedPost[]
  nextCursor: string | null
  hasMore: boolean
}

export type HealthInfo = {
  status: string
  database: string
  version: string
  serverTime: string | null
}
