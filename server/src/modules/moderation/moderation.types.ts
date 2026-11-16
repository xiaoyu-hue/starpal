// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ModerationAction } from './moderation.constants.js'

/**
 * 日志写入的最小执行器接口：生产传 withTransaction 的 client，测试传 PGlite。
 * 与 reports / auth 等模块的 Executor 同构，保证同一段 SQL 两处通用。
 */
export type LogExecutor = {
  query(sql: string, params: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

/** 写入一条审核日志的输入。身份字段由服务层注入，不采信请求体。 */
export type LogInput = {
  actorId: string | null
  action: ModerationAction
  targetType: string
  targetId: number
  metadata?: Record<string, unknown> | null
}

/** 完整日志行（管理端读取用）。公开视图另走脱敏投影，不含 actor_id / metadata。 */
export type ModerationLogRow = {
  id: string
  actor_id: string | null
  action: string
  target_type: string
  target_id: string
  metadata: Record<string, unknown> | null
  created_at: Date
}
