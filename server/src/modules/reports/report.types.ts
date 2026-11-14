// SPDX-License-Identifier: AGPL-3.0-or-later
import type {
  ReportKind,
  ReportStatus,
  ReportTargetType,
  ReportDecision,
} from '../../config/report-constants.js'
import type { CursorPayload } from '../../shared/pagination.js'

/** 数据库行（BIGSERIAL / TIMESTAMPTZ 经 pg 映射为 string / Date）。 */
export type ReportRow = {
  id: string
  kind: string
  target_type: string | null
  target_id: string | null
  reason: string
  detail: string
  status: string
  resolution_note: string | null
  resolved_at: Date | null
  created_at: Date
  reporter_username?: string
  reporter_display_name?: string
  reporter_status?: string
}

/** 「我的提交」对外投影：不含举报人（本人即提交人）。 */
export type ReportItem = {
  id: number
  kind: ReportKind
  targetType: ReportTargetType | null
  targetId: number | null
  reason: string
  detail: string
  status: ReportStatus
  resolutionNote: string | null
  resolvedAt: string | null
  createdAt: string
}

/** 管理队列项：额外带提交人，供运营者定位；已注销账号去标识化。 */
export type ReportQueueItem = ReportItem & {
  reporter: { username: string; displayName: string }
}

export type ReportPage<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export type SubmitReportInput = {
  kind: ReportKind
  targetType: ReportTargetType | null
  targetId: number | null
  reason: string
  detail: string
}

export type ReportListQuery = {
  cursor: CursorPayload | null
  limit: number
  /** 仅管理队列使用；null 表示不过滤。 */
  status: ReportStatus | null
}

export type DecisionInput = {
  decision: ReportDecision
  note: string | null
}

/** 服务层身份最小结构：仅取所需字段，不耦合 express 的 Request 扩展。 */
export type Actor = { id: string; role: string }
