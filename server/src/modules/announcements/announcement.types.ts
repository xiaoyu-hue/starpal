// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 社区公告的类型定义。
 *
 * 公告分三层（ARCHITECTURE.md §6.2）：
 * - **发布记录**（`source: 'history'`）：功能上线说明，属历史档案，随代码版本走，不可编辑；
 * - **当前状态** / **运营通知**（`source: 'notice'`）：进数据库，可草稿、可置顶、可编辑。
 *
 * 两个来源在接口层收敛成同一种视图，前端只写一套渲染逻辑——否则「档案」与「通知」
 * 会长出两套卡片，早晚改漏一处。
 */

export const ANNOUNCEMENT_KINDS = ['feature', 'fix', 'rule', 'status', 'notice'] as const
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number]

export const ANNOUNCEMENT_STATUSES = ['draft', 'published'] as const
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number]

/** 对外视图：档案与库内公告共用。 */
export type AnnouncementView = {
  /** `n-12` 表示库内第 12 条，`h-2026-11-15-3` 表示历史档案第 3 条；前端仅用作 key。 */
  id: string
  kind: AnnouncementKind
  title: string
  summary: string
  /** 明细：库内公告按行拆，历史档案取 changes 数组。 */
  points: string[]
  action: string | null
  /** 东八区日期 `YYYY-MM-DD`。 */
  date: string
  pinned: boolean
  source: 'notice' | 'history'
}

export type AnnouncementFeed = {
  /** 已发布且置顶，按发布时间倒序。 */
  pinned: AnnouncementView[]
  /** 已发布未置顶，按发布时间倒序。 */
  notices: AnnouncementView[]
  /** 代码里的发布记录，按日期倒序。 */
  history: AnnouncementView[]
}

/** 管理列表用：比对外视图多出草稿状态与操作信息。 */
export type AnnouncementAdminItem = AnnouncementView & {
  /** 数字主键：公开视图的 `id` 是带前缀的字符串，管理端调接口要用真 id。 */
  numericId: number
  status: AnnouncementStatus
  /** ISO 时间戳，编辑表单回填用。 */
  updatedAt: string
  createdAt: string
}

export type AnnouncementInput = {
  kind: AnnouncementKind
  title: string
  summary: string
  body: string
  isPinned: boolean
  status: AnnouncementStatus
}

export type AnnouncementPatch = Partial<AnnouncementInput>
