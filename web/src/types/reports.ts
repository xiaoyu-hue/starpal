// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 举报 / 申诉类型契约。
 * 单独成文件而非塞进 api.ts：后者已近行数预算（≤300 行），且本域类型自成体系。
 * 枚举值与后端 config/report-constants.ts、011_reports.sql 的 CHECK 保持一致。
 */

export type ReportKind = 'report' | 'appeal'
export type ReportStatus = 'pending' | 'resolved' | 'dismissed'
export type ReportDecision = 'resolve' | 'dismiss'
export type ReportTargetType = 'post' | 'comment'

/** 举报原因（申诉不使用，服务端固定为 appeal）。 */
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'copyright' | 'other'

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: '广告 / 刷屏' },
  { value: 'harassment', label: '骚扰 / 辱骂' },
  { value: 'inappropriate', label: '不当内容' },
  { value: 'copyright', label: '侵权 / 未经授权转载' },
  { value: 'other', label: '其它（请在说明中写清）' },
]

/** 说明与答复长度，与后端 REPORT_DETAIL_* / REPORT_NOTE_MAX 同值；前端仅作体验提示。 */
export const REPORT_DETAIL_MIN = 5
export const REPORT_DETAIL_MAX = 1000
export const REPORT_NOTE_MAX = 500

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

/** 管理队列项带提交人；「我的提交」不含该字段。 */
export type ReportQueueItem = ReportItem & {
  reporter: { username: string; displayName: string }
}

export type ReportPage<T = ReportItem> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export type SubmitReportPayload = {
  kind: ReportKind
  targetType?: ReportTargetType
  targetId?: number
  reason?: ReportReason
  detail: string
}

export type DecisionPayload = {
  decision: ReportDecision
  note?: string
}

/** 状态与原因的中文展示，集中一处避免各页面各写一套。 */
export const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: '待处理',
  resolved: '已处理',
  dismissed: '已驳回',
}

export const REASON_LABEL: Record<string, string> = {
  ...Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label])),
  appeal: '申诉',
}
