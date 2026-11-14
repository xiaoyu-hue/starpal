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

/** 认证域的公开用户投影，与 server/src/modules/auth/auth.service.ts 的 PublicUser 一致。 */
export type PublicUser = {
  id: string
  username: string
  displayName: string
  role: string
  avatarUrl: string | null
  createdAt: string
}

export type LoginPayload = {
  username: string
  password: string
}

export type RegisterPayload = {
  username: string
  password: string
  displayName?: string
  inviteCode: string
  /** 蜜罐字段：真人不可见，随请求体提交；命中后由服务端静默丢弃。 */
  website?: string
}

/** 他人视角的公开资料投影，与 server/src/modules/users/user.types.ts 一致。 */
export type PublicProfile = {
  username: string
  displayName: string
  avatarUrl: string | null
  biography: string | null
  createdAt: string
  postCount: number
  optional:
    | { zodiac: string | null; mbti: string | null; ageBand: string | null }
    | null
}

/** 本人视角资料：含可选字段真实值与公开开关，与 PublicProfile 分离。 */
export type OwnProfile = {
  username: string
  displayName: string
  avatarUrl: string | null
  biography: string | null
  createdAt: string
  postCount: number
  showOptional: boolean
  zodiac: string | null
  mbti: string | null
  ageBand: string | null
}

/** 资料编辑请求体：仅提交需要变更的字段（支持逐项清空为 null）。 */
export type ProfileUpdatePayload = Partial<{
  displayName: string
  avatarUrl: string | null
  biography: string | null
  zodiac: string | null
  mbti: string | null
  ageBand: string | null
  showOptional: boolean
}>

/** 公开个人页帖子占位：M3 落地前恒为空。 */
export type UserPostsPage = {
  items: never[]
  nextCursor: string | null
  hasMore: boolean
}

/** 元信息（说明页文案）：只读常量经 /api/meta/* 下发，与后端 config/constants 一致。 */

/** 社区准则：与 server/src/config/constants.ts 的 GUIDELINES 一致。 */
export type MetaGuidelines = {
  version: string
  title: string
  principles: string[]
}

/** 隐私说明：分节文案，与后端 PRIVACY 一致。 */
export type MetaPrivacy = {
  version: string
  title: string
  sections: { heading: string; paragraphs: string[] }[]
}

/** 关于页：站点名称、当前版本、建站日期。 */
export type MetaAbout = {
  siteName: string
  version: string
  launchDate: string
}
