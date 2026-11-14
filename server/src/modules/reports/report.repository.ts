// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import { DELETED_DISPLAY_NAME } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import type { CursorPayload } from '../../shared/pagination.js'
import type {
  ReportItem,
  ReportQueueItem,
  ReportRow,
  SubmitReportInput,
} from './report.types.js'

/**
 * 举报 / 申诉持久化层。
 *
 * 与互动模块同一范式：接受最小执行器接口，生产传连接池、测试传 PGlite，
 * 同一段 SQL 直接在内存真库里验证，不为测试另写一份「近似」实现。
 */
export type Executor = {
  query(sql: string, params: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

const poolExecutor: Executor = { query: (sql, params) => pool.query(sql, params) }

/**
 * 目标可见性口径：与 post.projection.ts 的 VISIBLE 保持一致
 * （已发布、未软删、话题未归档、作者未被停用）。改动这里必须同步那边。
 * 举报只接受「当前公开可见」的内容：草稿、已移除、已删除、停用作者的内容
 * 一律按不存在处理，既避免无意义举报，也不让人借举报探测不可见内容是否存在。
 */
const POST_VISIBLE = `
  p.status = 'published'
  AND p.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND u.status <> 'suspended'
`

/**
 * 校验举报目标存在且可见。多态目标无法建外键，故在此以参数化查询兜底；
 * 评论还要求其所属帖子可见，否则「举报一条挂在已删帖下的评论」无从核对。
 * 以「是否返回行」判定：SELECT 常量在不同驱动下可能是数字或布尔，不依赖其值。
 */
export async function assertTargetVisible(
  targetType: 'post' | 'comment',
  targetId: number,
  executor: Executor = poolExecutor,
): Promise<void> {
  const sql =
    targetType === 'post'
      ? `SELECT 1 FROM posts p
           JOIN topics t ON t.id = p.topic_id
           JOIN users u ON u.id = p.author_id
          WHERE p.id = $1 AND ${POST_VISIBLE}`
      : `SELECT 1 FROM comments c
           JOIN posts p ON p.id = c.post_id
           JOIN topics t ON t.id = p.topic_id
           JOIN users u ON u.id = p.author_id
          WHERE c.id = $1 AND c.status = 'published' AND ${POST_VISIBLE}`
  const result = await executor.query(sql, [targetId])
  if (result.rows.length === 0) {
    throw new DomainError('NOT_FOUND', '举报目标不存在或不可见')
  }
}

/** 提交：唯一索引（同一目标 pending 去重）冲突由服务层归一为 CONFLICT。 */
export async function insertReport(
  input: SubmitReportInput,
  reporterId: string,
  executor: Executor = poolExecutor,
): Promise<ReportItem> {
  const result = await executor.query(
    `INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, kind, target_type, target_id, reason, detail, status,
               resolution_note, resolved_at, created_at`,
    [input.kind, reporterId, input.targetType, input.targetId, input.reason, input.detail],
  )
  return toItem(result.rows[0] as ReportRow)
}

const LIST_COLUMNS = `
  id, kind, target_type, target_id, reason, detail, status,
  resolution_note, resolved_at, created_at
`

/** 「我的提交」：只按 reporter_id 过滤，服务端不采信任何客户端传入的用户标识。 */
export async function listMyReports(
  reporterId: string,
  cursor: CursorPayload | null,
  limit: number,
  executor: Executor = poolExecutor,
): Promise<{ rows: ReportRow[]; hasMore: boolean }> {
  const result = await executor.query(
    `SELECT ${LIST_COLUMNS} FROM reports
      WHERE reporter_id = $1
        AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::bigint))
      ORDER BY created_at DESC, id DESC
      LIMIT $4`,
    [reporterId, cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )
  const rows = result.rows as ReportRow[]
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit }
}

/** 管理队列：JOIN 提交人供运营者定位；已注销账号去标识化，避免暴露旧资料。 */
export async function listReportQueue(
  status: string | null,
  cursor: CursorPayload | null,
  limit: number,
  executor: Executor = poolExecutor,
): Promise<{ rows: ReportRow[]; hasMore: boolean }> {
  const result = await executor.query(
    `SELECT r.id, r.kind, r.target_type, r.target_id, r.reason, r.detail, r.status,
            r.resolution_note, r.resolved_at, r.created_at,
            u.username AS reporter_username,
            u.display_name AS reporter_display_name,
            u.status AS reporter_status
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
      WHERE ($1::varchar IS NULL OR r.status = $1)
        AND ($2::timestamptz IS NULL OR (r.created_at, r.id) < ($2::timestamptz, $3::bigint))
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $4`,
    [status, cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )
  const rows = result.rows as ReportRow[]
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit }
}

/** 决策：仅 pending → 终态，条件更新保证终态不可被重复决策或覆盖。 */
export async function decideReport(
  id: number,
  status: 'resolved' | 'dismissed',
  note: string | null,
  adminId: string,
  executor: Executor = poolExecutor,
): Promise<ReportItem> {
  const result = await executor.query(
    `UPDATE reports
        SET status = $2, resolution_note = $3, resolved_by = $4, resolved_at = now()
      WHERE id = $1 AND status = 'pending'
      RETURNING ${LIST_COLUMNS}`,
    [id, status, note, adminId],
  )
  const row = result.rows[0] as ReportRow | undefined
  if (row === undefined) {
    throw new DomainError('CONFLICT', '该提交不存在或已处理')
  }
  return toItem(row)
}

export function toItem(row: ReportRow): ReportItem {
  return {
    id: Number(row.id),
    kind: row.kind as ReportItem['kind'],
    targetType: (row.target_type as ReportItem['targetType']) ?? null,
    targetId: row.target_id === null ? null : Number(row.target_id),
    reason: String(row.reason),
    detail: String(row.detail),
    status: row.status as ReportItem['status'],
    resolutionNote: (row.resolution_note as string | null) ?? null,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export function toQueueItem(row: ReportRow): ReportQueueItem {
  const erased = row.reporter_status === 'deleted'
  return {
    ...toItem(row),
    reporter: {
      username: erased ? '已注销用户' : String(row.reporter_username ?? ''),
      displayName: erased ? DELETED_DISPLAY_NAME : String(row.reporter_display_name ?? ''),
    },
  }
}
