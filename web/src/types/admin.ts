// SPDX-License-Identifier: AGPL-3.0-or-later
/** 管理端 API 类型：与后端 admin / topics 模块的对外投影一一对应。 */

export type AdminPage<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export type AdminUser = {
  id: number
  username: string
  displayName: string
  role: string
  status: string
  createdAt: string
}

export type AdminContent = {
  id: number
  authorName: string
  body: string
  status: string
  createdAt: string
  postId: number | null
}

export type AdminTopic = {
  id: number
  slug: string
  nameZh: string
  nameEn: string
  description: string | null
  icon: string | null
  sortOrder: number
  isDemo: boolean
  archived: boolean
  createdAt: string
}

export type AdminStats = {
  userCount: number
  postCount: number
  commentCount: number
  pendingReportCount: number
}

export type TopicDraft = {
  slug: string
  nameZh: string
  nameEn: string
  description: string | null
  icon: string | null
  sortOrder: number
}
