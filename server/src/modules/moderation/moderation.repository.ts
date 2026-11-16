// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import type { LogExecutor, LogInput, ModerationLogRow } from './moderation.types.js'

/**
 * 审核日志持久化层：只提供 INSERT 与 SELECT，刻意不提供 UPDATE / DELETE。
 *
 * 「只追加」不靠数据库权限（应用用单一 DB 角色，REVOKE 无法真正隔离），
 * 而靠这一层根本没有改删函数——上层拿不到改删入口，日志就改不动。
 * 与 ARCHITECTURE ADR-010 的「只追加审核日志」一致。
 */

/** 写入一条日志。返回完整行，供调用方核对确已落库。 */
export async function insertLog(
  input: LogInput,
  executor: LogExecutor = pool,
): Promise<ModerationLogRow> {
  const result = await executor.query(
    `INSERT INTO moderation_logs (actor_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, actor_id, action, target_type, target_id, metadata, created_at`,
    [
      input.actorId,
      input.action,
      input.targetType,
      input.targetId,
      input.metadata == null ? null : JSON.stringify(input.metadata),
    ],
  )
  return result.rows[0] as ModerationLogRow
}

const LOG_COLUMNS = `id, actor_id, action, target_type, target_id, metadata, created_at`

/** 管理端完整日志：按时间倒序、键集翻页（与举报队列同口径）。 */
export async function listLogs(
  cursor: { t: string; id: string } | null,
  limit: number,
  executor: LogExecutor = pool,
): Promise<{ rows: ModerationLogRow[]; hasMore: boolean }> {
  const result = await executor.query(
    `SELECT ${LOG_COLUMNS} FROM moderation_logs
      WHERE ($1::timestamptz IS NULL OR (created_at, id) < ($1::timestamptz, $2::bigint))
      ORDER BY created_at DESC, id DESC
      LIMIT $3`,
    [cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )
  const rows = result.rows as ModerationLogRow[]
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit }
}
