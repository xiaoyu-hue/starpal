// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import type { MetricsExecutor } from '../../shared/metrics.js'

/**
 * 等级数据层：只碰两件事——读一个成员的档案与历史最高等级、把历史最高往上抬。
 *
 * 不在这里算经验与等级：那是 `level.rules.ts` 的纯函数职责。
 * 分开的好处是「L50 到底要多少经验」可以单测，不必启动数据库。
 */

export type LevelUserRow = {
  id: string
  status: string
  display_name: string
  top_level: number
}

/** 按用户名取档案；停用 / 已注销的区分交给服务层（与公开资料页口径一致）。 */
export async function findLevelUser(
  username: string,
  executor: MetricsExecutor = pool,
): Promise<LevelUserRow | null> {
  const result = await executor.query(
    `SELECT id, status, display_name, top_level FROM users WHERE username = $1`,
    [username],
  )
  return (result.rows as LevelUserRow[])[0] ?? null
}

/**
 * 抬高历史最高等级。**只在晋级时执行**，退步时不写入。
 *
 * `WHERE top_level < $2` 让这条语句自带幂等与并发安全：同一个成员被两个请求同时读到
 * 「该升到 L20」，两条 UPDATE 也只有第一条命中，第二条的 WHERE 不成立、不动一行。
 * 不碰 `updated_at`——那是资料更新时间，被等级刷掉会让「资料多久没改」失真。
 */
export async function raiseTopLevel(
  userId: string,
  level: number,
  executor: MetricsExecutor = pool,
): Promise<void> {
  await executor.query(
    `UPDATE users SET top_level = $2 WHERE id = $1 AND top_level < $2`,
    [userId, level],
  )
}
