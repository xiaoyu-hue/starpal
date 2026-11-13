/** 个人资料对外类型：公开投影与本人视角分离，字段命名统一小驼峰（与前端一致）。 */

/** 他人视角的公开投影：可选资料仅在用户显式公开时返回。 */
export type PublicProfile = {
  username: string
  displayName: string
  avatarUrl: string | null
  biography: string | null
  createdAt: string
  postCount: number
  /** 未公开或已注销时为 null；否则为各选填字段当前值（单项仍可能为 null）。 */
  optional: {
    zodiac: string | null
    mbti: string | null
    ageBand: string | null
  } | null
}

/** 本人视角：始终返回可选字段真实值，供设置页回填；含 showOptional 开关。 */
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

import type { PostListItem } from '../posts/index.js'

/** 公开个人页的帖子列表：与信息流共用同一列表投影，避免两处字段漂移。 */
export type UserPostsPage = {
  items: PostListItem[]
  nextCursor: string | null
  hasMore: boolean
}
