// SPDX-License-Identifier: AGPL-3.0-or-later
/** 话题管理端类型：管理列表项比公开 TopicSummary 多归档态与演示标记。 */

/** 最小执行器接口，与 admin / moderation 模块同构；生产传 withTransaction 的 client，测试传 PGlite。 */
export type Executor = {
  query(sql: string, params: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

export type AdminTopicItem = {
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

/** 新建话题输入：slug 由运营者指定，创建人取登录态不采信请求体。 */
export type AdminTopicInput = {
  slug: string
  nameZh: string
  nameEn: string
  description: string | null
  icon: string | null
  sortOrder: number
}

/** 编辑输入：不含 slug（slug 是对外定位符，改名会断链），不含归档态。 */
export type TopicUpdateInput = Omit<AdminTopicInput, 'slug'>
