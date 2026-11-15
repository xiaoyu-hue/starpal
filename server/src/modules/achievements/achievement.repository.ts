// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import {
  FROM_JOINS,
  PROJECTION,
  VISIBLE,
  queryRows,
  type PostRecord,
  type RowExecutor,
} from '../posts/index.js'

/** 相对导入一律带 .js（server R3）；执行器形状与 posts / messages 一致，测试可注入 PGlite。 */

export type AchievementRow = {
  code: string
  name_zh: string
  description: string
  condition: unknown
  sort_order: number
}

export type UnlockedRow = {
  achievement_code: string
  unlocked_at: Date
}

/**
 * 行类型收敛：`RowExecutor.query` 的行类型固定为帖子投影，本模块查的是别的表。
 * 经 unknown 转一次是唯一诚实的写法——请求的列与断言的类型由上面每条 SQL 自己保证，
 * 再由集成测试对着真实表结构验证，而不是靠类型系统猜。
 */
async function rowsOf<T>(
  executor: RowExecutor,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await executor.query(sql, params)
  return result.rows as unknown as T[]
}

/**
 * 指标采集已上移到 `shared/metrics.ts`（等级模块复用同一份统计口径）。
 * 这里转出，让本模块的调用方不必知道它搬过家；两处算法永远不会分叉。
 */
export { collectMetrics } from '../../shared/metrics.js'

/** 成就定义目录：只取启用中的，按展示顺序。图标不进 SQL——图形属于表现层，由前端按 code 自绘。 */
export async function listDefinitions(
  executor: RowExecutor = pool,
): Promise<AchievementRow[]> {
  return rowsOf<AchievementRow>(
    executor,
    `SELECT code, name_zh, description, condition, sort_order
       FROM achievements
      WHERE is_active = true
      ORDER BY sort_order, code`,
  )
}

/** 某用户已解锁的成就（键 → 解锁时间）。 */
export async function listUnlocked(
  userId: string,
  executor: RowExecutor = pool,
): Promise<UnlockedRow[]> {
  return rowsOf<UnlockedRow>(
    executor,
    `SELECT achievement_code, unlocked_at
       FROM user_achievements
      WHERE user_id = $1`,
    [userId],
  )
}

/**
 * 批量写入解锁记录，返回本次真正新增的行。
 *
 * `ON CONFLICT DO NOTHING` 是幂等的关键：判定随时可能重复执行（同一次访问可触发多次），
 * 没有这一句就会因主键冲突整体失败；有了它，重复调用只返回空数组。
 * 冲突时不覆盖 unlocked_at——首次解锁时间才是时间线要展示的事实。
 */
export async function insertUnlocked(
  userId: string,
  codes: string[],
  executor: RowExecutor = pool,
): Promise<UnlockedRow[]> {
  if (codes.length === 0) return []
  return rowsOf<UnlockedRow>(
    executor,
    `INSERT INTO user_achievements (user_id, achievement_code)
     SELECT $1::bigint, code FROM unnest($2::text[]) AS code
     ON CONFLICT (user_id, achievement_code) DO NOTHING
     RETURNING achievement_code, unlocked_at`,
    [userId, codes],
  )
}

/** 按用户名取 id 与状态（含已注销，用于区分「不存在」与「已注销」）。 */
export async function findUserRef(
  username: string,
  executor: RowExecutor = pool,
): Promise<{ id: string; status: string; display_name: string } | null> {
  const rows = await rowsOf<{ id: string; status: string; display_name: string }>(
    executor,
    `SELECT id, status, display_name FROM users WHERE username = $1`,
    [username],
  )
  return rows[0] ?? null
}

/**
 * 每周热门：本周发布的帖子里按互动量排序。
 *
 * 「周」按东八区计算：中国自 1991 年起不再实行夏令时，UTC+8 恒成立，
 * 故用固定偏移而不是 `AT TIME ZONE 'Asia/Shanghai'`——后者依赖数据库时区库，
 * 在 WASM 构建里不保证完整。`date_trunc('week')` 以周一为一周起点。
 *
 * 门槛 `like_count + comment_count >= 1`：否则新帖全 0 互动也会进榜，
 * 「热门」会退化成「最新」，与 `FR-ACH-03` 的只读聚合语义不符。
 */
const WEEK_OFFSET = `interval '8 hours'`
const WEEK_START = `(date_trunc('week', now() + ${WEEK_OFFSET}) - ${WEEK_OFFSET})`

const WEEKLY_SQL = `
  SELECT ${PROJECTION}
  ${FROM_JOINS}
  WHERE ${VISIBLE}
    AND p.is_demo = false
    AND p.created_at >= ${WEEK_START}
    AND p.created_at <  ${WEEK_START} + interval '7 days'
    AND (p.like_count + p.comment_count) >= 1
  ORDER BY (p.like_count + p.comment_count * 2) DESC, p.created_at DESC
  LIMIT $1
`

export async function listWeeklyPopular(
  limit: number,
  executor: RowExecutor = pool,
): Promise<PostRecord[]> {
  return queryRows(executor, WEEKLY_SQL, [limit])
}

/** 本周窗口的起止时刻，供前端显示「本周」范围（同一套偏移口径）。 */
export async function getWeekRange(
  executor: RowExecutor = pool,
): Promise<{ start: string; end: string }> {
  const rows = await rowsOf<{ starts_at: Date; ends_at: Date }>(
    executor,
    `SELECT ${WEEK_START} AS starts_at, ${WEEK_START} + interval '7 days' AS ends_at`,
  )
  const row = rows[0]!
  return { start: row.starts_at.toISOString(), end: row.ends_at.toISOString() }
}
