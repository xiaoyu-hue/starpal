import type { POST_STATUS } from '../../config/constants.js'

/**
 * 帖子对外类型：列表投影与详情投影分离。
 * 字段命名统一小驼峰，与前端 `web/src/types/api.ts` 的 FeedPost / 详情结构一致。
 * 投影中不出现 author_id、topic_id 等内部主键，对外只以 username 与 topic slug 定位。
 */

export type PostStatus = (typeof POST_STATUS)[number]

export type PostAuthorBrief = {
  username: string
  displayName: string
  avatarUrl: string | null
}

export type PostTopicBrief = {
  slug: string
  nameZh: string
}

/** 列表项：信息流卡片所需字段，不含正文全文。 */
export type PostListItem = {
  id: number
  title: string
  excerpt: string
  topic: PostTopicBrief
  author: PostAuthorBrief
  likeCount: number
  commentCount: number
  /** 图片引用键（`post_images.storage_key`）；前端拼 `/api/images/:key`。M3-S3 前恒为空。 */
  images: string[]
  createdAt: string
}

/** 详情：列表字段 + 正文全文 + 状态 + 是否本人（供前端决定是否展示编辑入口）。 */
export type PostDetail = PostListItem & {
  body: string
  status: PostStatus
  updatedAt: string
  isAuthor: boolean
}

export type PostPage = {
  items: PostListItem[]
  nextCursor: string | null
  hasMore: boolean
}
