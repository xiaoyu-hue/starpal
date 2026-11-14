// SPDX-License-Identifier: AGPL-3.0-or-later
import { ROLE_ADMIN } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { encodeCursor } from '../../shared/pagination.js'
import {
  assertTargetVisible,
  decideReport,
  insertReport,
  listMyReports,
  listReportQueue,
  type Executor,
  toItem,
  toQueueItem,
} from './report.repository.js'
import type {
  Actor,
  DecisionInput,
  ReportItem,
  ReportListQuery,
  ReportPage,
  ReportQueueItem,
  SubmitReportInput,
} from './report.types.js'

/**
 * 举报 / 申诉业务层：权限复核、目标校验、状态与游标编排。
 * 所有外部传入的身份都不采信：提交人与管理员一律取路由守卫挂载的 principal。
 */

/** 纵深防御：管理端即便被误挂到无守卫的路由，服务层仍拒绝非管理员。 */
function assertAdmin(actor: Actor): void {
  if (actor.role !== ROLE_ADMIN) {
    throw new DomainError('FORBIDDEN', '无权访问该资源')
  }
}

/** 列表项都带排序键；约束泛型使游标生成对两类列表共用一份实现。 */
function pageOf<T extends { id: number; createdAt: string }>(
  items: T[],
  hasMore: boolean,
): ReportPage<T> {
  const last = items[items.length - 1]
  return {
    items,
    hasMore,
    nextCursor:
      hasMore && last ? encodeCursor({ t: last.createdAt, id: String(last.id) }) : null,
  }
}

export async function submitReport(
  actor: Actor,
  input: SubmitReportInput,
  executor?: Executor,
): Promise<ReportItem> {
  if (input.kind === 'report' && input.targetType !== null && input.targetId !== null) {
    await assertTargetVisible(input.targetType, input.targetId, executor)
  }
  try {
    return await insertReport(input, actor.id, executor)
  } catch (error) {
    // 部分唯一索引 reports_pending_target_idx：同一目标已有待处理举报。
    // 归一为冲突，避免把数据库约束错误原样抛成 500。
    if (isUniqueViolation(error)) {
      throw new DomainError('CONFLICT', '你已提交过针对该内容的举报，请等待处理')
    }
    throw error
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  )
}

export async function getMyReports(
  actor: Actor,
  query: ReportListQuery,
  executor?: Executor,
): Promise<ReportPage<ReportItem>> {
  const { rows, hasMore } = await listMyReports(actor.id, query.cursor, query.limit, executor)
  return pageOf(rows.map(toItem), hasMore)
}

export async function getReportQueue(
  actor: Actor,
  query: ReportListQuery,
  executor?: Executor,
): Promise<ReportPage<ReportQueueItem>> {
  assertAdmin(actor)
  const { rows, hasMore } = await listReportQueue(query.status, query.cursor, query.limit, executor)
  return pageOf(rows.map(toQueueItem), hasMore)
}

export async function decideOnReport(
  actor: Actor,
  id: number,
  input: DecisionInput,
  executor?: Executor,
): Promise<ReportItem> {
  assertAdmin(actor)
  const status = input.decision === 'resolve' ? 'resolved' : 'dismissed'
  return decideReport(id, status, input.note, actor.id, executor)
}
