// SPDX-License-Identifier: AGPL-3.0-or-later
/** 管理端列表项与状态变更输入类型。对外投影只含展示所需字段，不含内部凭据。 */

export type Executor = {
  query(sql: string, params: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

/** 操作者身份：一律取路由守卫挂载的 principal，不采信请求体。 */
export type AdminActor = { id: string; role: string }

/** 用户管理列表项。status 供前端显示「正常 / 已停用 / 已注销」。 */
export type AdminUserItem = {
  id: number
  username: string
  displayName: string
  role: string
  status: string
  createdAt: string
}

/** 内容管理列表项：帖子与评论共用形状，含状态与作者，供运营者定位。 */
export type AdminContentItem = {
  id: number
  authorName: string
  body: string
  status: string
  createdAt: string
  postId: number | null
}

/** 用户状态目标：只允许 suspended（停用）/ active（恢复）；注销态不可由管理端翻转。 */
export type UserStatusTarget = 'suspended' | 'active'

/** 内容状态目标：只允许 removed（移除）/ published（恢复）。 */
export type ContentStatusTarget = 'removed' | 'published'

export type AdminPage<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}
