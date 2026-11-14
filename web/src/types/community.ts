// SPDX-License-Identifier: AGPL-3.0-or-later
/** 社区互动相关类型：通知与邀请码。拆出是为让 api.ts 回落到行数预算内。 */

/** 单条通知：target 字段随类型扩展，当前仅 comment 一种。 */
export type NotificationItem = {
  id: number
  type: string
  isRead: boolean
  createdAt: string
  actorId: string | null
  actorUsername: string | null
  actorDisplayName: string | null
  actorStatus: string | null
  actorAvatarUrl: string | null
  /** comment 类型专用：被评论的帖子与评论主键，供跳转。 */
  commentId: number | null
  postId: number | null
  postTitle: string | null
}

/** 通知列表：键集游标分页，cursor 为下一页起点（null 表示没有更多）。 */
export type NotificationList = {
  items: NotificationItem[]
  hasMore: boolean
  cursor: { t: string; id: string } | null
}

/** 邀请码状态：可用 / 已使用 / 已撤销。 */
export type InviteCodeStatus = 'available' | 'used' | 'revoked'

/** 单条邀请码：明文不返回，列表只暴露状态与备注等管理信息。 */
export type InviteCodeItem = {
  id: number
  note: string | null
  status: InviteCodeStatus
  createdBy: string | null
  createdByUsername: string | null
  usedBy: string | null
  usedByUsername: string | null
  usedAt: string | null
  revokedAt: string | null
  createdAt: string
}

/** 邀请码列表（运营者视角）。 */
export type InviteCodeList = { items: InviteCodeItem[] }

/** 生成邀请码的返回：明文仅此次返回，须当场发给对方。 */
export type GenerateInviteResult = { codes: string[] }
