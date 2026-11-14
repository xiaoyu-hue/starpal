// SPDX-License-Identifier: AGPL-3.0-or-later
import { Pool, type PoolClient } from 'pg'
import { appEnv } from '../config/env.js'

export const pool = new Pool({
  connectionString: appEnv.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'starpal',
})

pool.on('error', (error) => {
  // 空闲连接异常不应导致进程崩溃，交由健康检查暴露状态
  console.error('[db] 空闲连接错误:', error.message)
})

/** 启动校验连接：执行一次真实查询，失败即抛出。 */
export async function assertDatabase(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}

/** 事务封装：相关操作在同一连接内提交或回滚。 */
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function closePool(): Promise<void> {
  await pool.end()
}
