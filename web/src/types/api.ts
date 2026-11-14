// SPDX-License-Identifier: AGPL-3.0-or-later
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

/**
 * 帖子图片引用：只含键与尺寸，字节经 `/api/images/:key` 单独取。
 * `width/height` 用于预留占位框，避免图片加载完成时把正文顶下去。
 */
export type PostImage = {
  id: number
  key: string
  width: number
  height: number
}

/** 上传成功后的回执，与服务端 `upload.types.ts` 的 UploadedImage 一致。 */
export type UploadedImage = {
  id: number
  key: string
  url: string
  mimeType: string
  width: number
  height: number
  byteSize: number
  sortOrder: number
}

export type FeedPost = {
  id: number
  title: string
  excerpt: string
  topic: { slug: string; nameZh: string }
  /** displayName 由服务端统一下发（已注销作者为「已注销用户」），卡片署名以此为准。 */
  author: { username: string; displayName: string; avatarUrl: string | null }
  likeCount: number
  commentCount: number
  bookmarkCount: number
  /** 当前读者是否已点赞 / 收藏；匿名读者恒为 false。 */
  isLiked: boolean
  isBookmarked: boolean
  images: PostImage[]
  createdAt: string
}

export type FeedPage = {
  items: FeedPost[]
  nextCursor: string | null
  hasMore: boolean
}

/** 话题目录项，与 server/src/modules/topics/topic.types.ts 一致。 */
export type Topic = {
  id: number
  slug: string
  nameZh: string
  nameEn: string
  description: string | null
  icon: string | null
  sortOrder: number
  postCount: number
}

export type PostStatus = 'draft' | 'published' | 'removed' | 'deleted'

/**
 * 帖子详情：列表字段 + 正文全文 + 状态。
 * `isAuthor` 由服务端判定（不采信前端推导），仅决定是否展示编辑与删除入口，
 * 真正的写权限仍由服务端校验。
 */
export type PostDetail = FeedPost & {
  /** 当前话题主键，供编辑页初始化话题单选。 */
  topicId: number
  body: string
  status: PostStatus
  updatedAt: string
  isAuthor: boolean
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
  /** 已阅读并同意用户协议：服务端据此留存同意版本与时间。 */
  acceptTerms?: boolean
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

/** 公开个人页帖子：与主信息流同一投影与游标规则。 */
export type UserPostsPage = FeedPage

/** 评论项：与 server/src/modules/comments/comment.types.ts 一致。 */
export type CommentItem = {
  id: number
  body: string
  /** `removed` 仅管理员在详情页可见，普通读者拿不到这类记录。 */
  status: 'published' | 'removed'
  /** 已注销作者的署名由服务端降级为「已注销用户」。 */
  author: { username: string; displayName: string; avatarUrl: string | null }
  createdAt: string
  isAuthor: boolean
  canRemove: boolean
}

export type CommentPage = {
  items: CommentItem[]
  nextCursor: string | null
  hasMore: boolean
}

/** 元信息（说明页文案）：只读常量经 /api/meta/* 下发，与后端 config/constants 一致。 */

/**
 * 说明页长文的内容块。与后端 config/docs/types.ts 的 DocBlock 一一对应；
 * 前后端各留一份定义是有意的——前端类型是消费契约，不应因后端内部重构而被动漂移。
 */
export type DocBlock =
  | { kind: 'p'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'note'; text: string }

export type DocSection = { heading: string; blocks: DocBlock[] }

/** 文档元信息：摘要给不愿读全文的人，两个日期分别表示「改过」与「生效」。 */
export type DocMeta = {
  title: string
  updatedAt: string
  effectiveAt: string
  summary: string
}

/** 社区准则：与后端 GUIDELINES 一致。 */
export type MetaGuidelines = DocMeta & {
  version: string
  sections: DocSection[]
}

/** 隐私说明：与后端 PRIVACY 一致。 */
export type MetaPrivacy = DocMeta & {
  version: string
  sections: DocSection[]
}

/** 用户协议：与后端 TERMS 一致。结构与准则、隐私说明相同。 */
export type MetaTerms = DocMeta & {
  version: string
  sections: DocSection[]
}

/** 免责声明：责任边界说明，与后端 DISCLAIMER 一致。 */
export type MetaDisclaimer = DocMeta & {
  version: string
  sections: DocSection[]
}

/** 产品声明：定位与合规状态说明，与后端 PRODUCT 一致。 */
export type MetaProduct = DocMeta & {
  siteName: string
  version: string
  sections: DocSection[]
}

/** 关于页：站点自述、技术构成与致谢，与后端 ABOUT 一致。 */
export type MetaAbout = {
  siteName: string
  version: string
  launchDate: string
  tagline: string
  intro: string[]
  whatWeDo: { title: string; body: string }[]
  stack: { group: string; items: { name: string; role: string }[] }[]
  /** 分离式许可与源码获取途径，与后端 ABOUT.licensing 一致。 */
  licensing: {
    heading: string
    intro: string
    items: { label: string; license: string; note: string }[]
    sourceUrl: string
    sourceNote: string
  }
  credits: { heading: string; paragraphs: string[] }
  feedback: { heading: string; paragraphs: string[] }
}

/** 公告类型：决定页面上的标签样式，与后端 AnnouncementKind 一一对应。 */
export type AnnouncementKind = 'feature' | 'fix' | 'rule' | 'status'

/** 单条公告：摘要供右栏卡片，changes 为公告页明细，action 为需要用户配合的事项。 */
export type Announcement = {
  date: string
  kind: AnnouncementKind
  title: string
  summary: string
  changes: string[]
  action?: string
}

/**
 * 通知与邀请码类型较多且自成体系，拆到 ./community.ts，
 * 此处仅重新导出以保持 `../../types/api` 的导入路径稳定。
 */
export type {
  NotificationItem,
  NotificationList,
  InviteCodeStatus,
  InviteCodeItem,
  InviteCodeList,
  GenerateInviteResult,
} from './community'

/** 社区公告：与后端 ANNOUNCEMENTS 一致，条目按时间倒序。 */
export type MetaAnnouncements = {
  version: string
  title: string
  items: Announcement[]
}
