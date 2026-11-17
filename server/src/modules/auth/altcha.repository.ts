// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import { ALTCHA_EXPIRY_SECONDS } from '../../config/altcha-constants.js'

/**
 * ALTCHA 一次性消费记录的数据访问。全部参数化查询，不拼接输入。
 *
 * 官方要求自托管必须自行防重放：同一份已验证载荷只能被接受一次。
 * 用载荷摘要作主键、INSERT ... ON CONFLICT 判断原子性，
 * 不会因为 Serverless 多实例并发出现「两个实例同时通过同一载荷」。
 * 与项目其它 repository 一致直接用模块级 pool——测试时由夹具接到 PGlite。
 */

/** 尝试原子消费一份载荷：全新则插入并返回 true，重复（重放）返回 false。 */
export async function consumeOnce(payloadHash: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + ALTCHA_EXPIRY_SECONDS * 1000)
  const result = await pool.query(
    `INSERT INTO altcha_consumed (payload_hash, expires_at) VALUES ($1, $2)
     ON CONFLICT (payload_hash) DO NOTHING`,
    [payloadHash, expiresAt],
  )
  return result.rowCount === 1
}

/** 清理已过期的消费记录，随认证链路的真实流量推进，不引入外部调度。 */
export async function pruneConsumed(): Promise<void> {
  await pool.query('DELETE FROM altcha_consumed WHERE expires_at <= now()')
}
