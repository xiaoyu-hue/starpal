// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  APPEAL_REASON,
  REPORT_DECISIONS,
  REPORT_DETAIL_MAX,
  REPORT_DETAIL_MIN,
  REPORT_KINDS,
  REPORT_MAX_PAGE_SIZE,
  REPORT_NOTE_MAX,
  REPORT_PAGE_SIZE,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type ReportDecision,
  type ReportKind,
  type ReportStatus,
  type ReportTargetType,
} from '../../config/report-constants.js'
import { DomainError } from '../../shared/errors.js'
import { decodeCursor } from '../../shared/pagination.js'
import { requireEnum, requireObject, requireString } from '../../shared/validation.js'
import type {
  DecisionInput,
  ReportListQuery,
  SubmitReportInput,
} from './report.types.js'

/**
 * 举报 / 申诉请求模式层：所有准入判断集中于此，控制器只做「解析 → 服务 → 包络」。
 * 客户端不采信为安全边界；申诉刻意不接受 target 字段，避免伪造不存在的处置记录。
 */

function parsePositiveInt(value: unknown, field: string): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(num) || num < 1) {
    throw new DomainError('VALIDATION_FAILED', `${field} 必须为正整数`, [
      { field, constraint: '正整数' },
    ])
  }
  return num
}

/** 提交：kind 决定后续字段，report 需目标与原因，appeal 只需说明。 */
export function parseSubmitInput(raw: unknown): SubmitReportInput {
  const body = requireObject(raw)
  const kind = requireEnum<ReportKind>(body.kind, 'kind', REPORT_KINDS)
  const detail = requireString(body.detail, {
    field: 'detail',
    min: REPORT_DETAIL_MIN,
    max: REPORT_DETAIL_MAX,
    trim: true,
    allowInnerWhitespace: true,
  })

  if (kind === 'appeal') {
    // 申诉固定原因、无目标；客户端多传的 target 一律忽略（不采纳、不回显）。
    return { kind, targetType: null, targetId: null, reason: APPEAL_REASON, detail }
  }

  return {
    kind,
    targetType: requireEnum<ReportTargetType>(body.targetType, 'targetType', REPORT_TARGET_TYPES),
    targetId: parsePositiveInt(body.targetId, 'targetId'),
    reason: requireEnum<string>(body.reason, 'reason', REPORT_REASONS),
    detail,
  }
}

/** 列表查询：cursor / limit / 可选状态过滤，与信息流游标同口径。 */
export function parseListQuery(query: Record<string, unknown>): ReportListQuery {
  let cursor: ReportListQuery['cursor'] = null
  if (query.cursor !== undefined && query.cursor !== '') {
    const value = typeof query.cursor === 'string' ? query.cursor : ''
    const decoded = value === '' ? null : decodeCursor(value)
    if (decoded === null) {
      throw new DomainError('VALIDATION_FAILED', 'cursor 参数格式非法', [
        { field: 'cursor', constraint: 'base64url 编码的游标' },
      ])
    }
    cursor = decoded
  }

  let limit = REPORT_PAGE_SIZE
  if (query.limit !== undefined) {
    const value = Number(query.limit)
    if (!Number.isInteger(value) || value < 1 || value > REPORT_MAX_PAGE_SIZE) {
      throw new DomainError('VALIDATION_FAILED', 'limit 参数超出允许范围', [
        { field: 'limit', constraint: `1..${REPORT_MAX_PAGE_SIZE}` },
      ])
    }
    limit = value
  }

  let status: ReportStatus | null = null
  if (query.status !== undefined && query.status !== '') {
    status = requireEnum<ReportStatus>(query.status, 'status', REPORT_STATUSES)
  }

  return { cursor, limit, status }
}

/** 管理员决策：动作枚举 + 可选答复（答复长度受限，可为空）。 */
export function parseDecisionInput(raw: unknown): DecisionInput {
  const body = requireObject(raw)
  const decision = requireEnum<ReportDecision>(body.decision, 'decision', REPORT_DECISIONS)
  let note: string | null = null
  if (body.note !== undefined && body.note !== null) {
    note = requireString(body.note, {
      field: 'note',
      min: 0,
      max: REPORT_NOTE_MAX,
      trim: true,
      allowInnerWhitespace: true,
    })
    if (note === '') note = null
  }
  return { decision, note }
}

/** 路径参数 `:id`：非法格式按资源不存在处理，不暴露路由细节。 */
export function parseReportId(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(num) || num < 1) throw new DomainError('NOT_FOUND', '提交不存在')
  return num
}
