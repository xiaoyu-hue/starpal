// SPDX-License-Identifier: AGPL-3.0-or-later
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { PGlite } from '@electric-sql/pglite'
import { createApiApp } from '../../src/api-app.js'
import { pool } from '../../src/db/pool.js'

/**
 * HTTP 层测试夹具：真实 Express 链路 + 真实 SQL，但不连外部数据库。
 *
 * 为什么不只测服务层：`AC-11` 要证明的是「未登录 / 非管理员进不来」，
 * 而这道门在 **Router 上**（`adminRouter.use(requireAuth, requireRole(...))`），
 * 服务层测试根本走不到它。手工 curl 验过一次就消散在聊天记录里，改动后没人重跑；
 * 这里把它钉成用例，任何一次 `npm test` 都会重新验证。
 *
 * 做法：把 `pool.query` 临时接到内存库上。`pg` 的 `Pool` 是模块级单例，
 * 改它的 `query` 方法即可让整条链路（中间件 → 控制器 → 仓储）都落到 PGlite，
 * 无需引入代理进程或改造生产代码。
 */
export type RunningApp = {
  /** 相对路径请求，自动拼上随机端口。 */
  request: (path: string, init?: RequestInit) => Promise<Response>
  close: () => Promise<void>
}

/** 适配 pg.Result 的形状差异：PGlite 用 affectedRows，pg 用 rowCount。 */
type PgLikeResult = { rows: unknown[]; rowCount: number }

export async function startTestServer(db: PGlite): Promise<RunningApp> {
  const originalQuery = pool.query.bind(pool)
  const originalConnect = pool.connect.bind(pool)
  const patched = pool as unknown as { query: unknown; connect: unknown }
  patched.query = async (text: string, params?: unknown[]): Promise<PgLikeResult> => {
    const result = await db.query(text, params as never)
    const affected = (result as { affectedRows?: number }).affectedRows
    return { rows: result.rows, rowCount: affected ?? result.rows.length }
  }
  // `withTransaction` 走 `pool.connect()`，一并接到同一个内存库上；
  // PGlite 是单连接实现，串行执行即可满足测试里的短事务。
  patched.connect = async () => {
    const client = {
      query: async (text: string, params?: unknown[]): Promise<PgLikeResult> => {
        const result = await db.query(text, params as never)
        const affected = (result as { affectedRows?: number }).affectedRows
        return { rows: result.rows, rowCount: affected ?? result.rows.length }
      },
      release: () => {},
    }
    return client
  }

  const server: Server = createServer(createApiApp())
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const base = `http://127.0.0.1:${port}`

  return {
    request: (path, init) => fetch(`${base}${path}`, init),
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
      patched.query = originalQuery
      patched.connect = originalConnect
    },
  }
}
