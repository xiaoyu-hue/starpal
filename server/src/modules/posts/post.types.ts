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

/**
 * 帖子图片引用。
 *
 * 只下发引用键与尺寸，不下发字节：字节经 `GET /api/images/:key` 单独取，可长期缓存。
 * `width` / `height` 是前端预留占位框的依据——缺了它，图片加载完成会把正文顶下去，
 * 滚动位置随之跳动（信息流里尤其明显）。
 * `id` 仅用于作者删除某张图；他人拿不到删除权限，暴露序号无意义也无风险。
 */
export type PostImage = {
  id: number
  key: string
  width: number
  height: number
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
  bookmarkCount: number
  /**
   * 当前读者是否已点赞 / 收藏。匿名读者恒为 false。
   * 这两项不是帖子的固有属性，而是「读者 × 帖子」的关系，故由服务层按 viewer 补齐，
   * 不放进帖子表的投影子查询，避免同一份 SQL 因参数位置不同而产生多个变体。
   */
  isLiked: boolean
  isBookmarked: boolean
  images: PostImage[]
  createdAt: string
}

/** 详情：列表字段 + 正文全文 + 状态 + 是否本人（供前端决定是否展示编辑入口）。 */
export type PostDetail = PostListItem & {
  /**
   * 当前话题主键。详情页本身已确认读者能看到该帖，暴露分类 ID 不构成越权信息；
   * 编辑页需要它把话题单选初始化为「当前话题」，否则要从 slug 反查，多一次请求。
   */
  topicId: number
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
