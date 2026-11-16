// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { pool } from '../../src/db/pool.js'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * `M7-S2-T2` 错误信息审查（自动化）。
 *
 * 要证明三件事，全在响应体上验：
 * 1. 未预期错误（数据库炸了）只回一句通用话术，不吐堆栈、SQL、表名、文件路径；
 * 2. 领域错误按码映射状态码，并带 `requestId` 供追查；
 * 3. 未知路径回统一 404 包络，而不是前端页面或空响应。
 *
 * 顺带钉住 `x-powered-by` 不出现——它等于免费告诉扫描器这是 Express。
 */

/** 长得像真实 pg 报错的异常：带 SQL 片段、表名与堆栈。 */
function fakeDbError(): Error {
  const error = new Error(
    'relation "users_private_vault" does not exist\nSELECT vault_key FROM users_private_vault WHERE id = $1',
  )
  error.stack = `Error: relation "users_private_vault" does not exist\n    at /workspace/server/src/db/pool.ts:42:11`
  return error
}

describe('M7-S2-T2 错误响应不泄露内部信息', () => {
  let db: PGlite
  let app: RunningApp
  const adminCookie = 'starpal_session=sess-admin'

  before(async () => {
    db = await createMigratedDb()
    await seedUser(db, 99, 'root')
    await db.exec(`UPDATE users SET role_id = 2 WHERE id = 99`)
    await db.exec(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES ('sess-admin', 99, now() + interval '1 day')
    `)
    app = await startTestServer(db)
  })

  after(async () => {
    await app.close()
    await db.close()
  })

  it('未预期错误只回通用话术，不泄露 SQL / 表名 / 文件路径 / 堆栈', async () => {
    const target = pool as unknown as { query: unknown }
    const working = target.query
    target.query = async () => {
      throw fakeDbError()
    }
    try {
      const res = await app.request('/api/admin/users', { headers: { cookie: adminCookie } })
      assert.equal(res.status, 500, '未预期错误应映射为 500')
      const body = (await res.json()) as {
        error: { code: string; message: string; requestId: string }
      }
      assert.equal(body.error.code, 'INTERNAL_ERROR')
      assert.equal(body.error.message, '服务暂时不可用，请稍后重试')

      const text = JSON.stringify(body)
      for (const leak of [
        'users_private_vault',
        'SELECT',
        'relation',
        'pool.ts',
        '/workspace',
        'at Error',
      ]) {
        assert.ok(!text.includes(leak), `响应体泄露了内部信息：${leak}`)
      }
      assert.match(body.error.requestId, /^[A-Za-z0-9_-]{1,64}$/, 'requestId 应可回查日志')
    } finally {
      target.query = working
    }
  })

  it('领域错误按码映射状态码，并回带同一个 requestId', async () => {
    const res = await app.request('/api/admin/topics', {
      method: 'POST',
      headers: { cookie: adminCookie, 'content-type': 'application/json' },
      body: '{}',
    })
    assert.equal(res.status, 400)
    const body = (await res.json()) as { error: { code: string; requestId: string } }
    assert.equal(body.error.code, 'VALIDATION_FAILED')
    assert.equal(
      res.headers.get('x-request-id'),
      body.error.requestId,
      '响应头与响应体的 requestId 必须一致，否则日志对不上',
    )
  })

  it('未知 API 路径回 404 包络，不回退前端页面', async () => {
    const res = await app.request('/api/definitely-not-a-route')
    assert.equal(res.status, 404)
    assert.match(res.headers.get('content-type') ?? '', /application\/json/)
    const body = (await res.json()) as { error: { code: string } }
    assert.equal(body.error.code, 'NOT_FOUND')
  })

  it('响应头不暴露技术栈', async () => {
    const res = await app.request('/api/health')
    assert.equal(res.headers.get('x-powered-by'), null, '不应回送 x-powered-by')
  })
})
