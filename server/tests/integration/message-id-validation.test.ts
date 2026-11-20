// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

process.env.DATABASE_URL ||= 'postgres://local/local'
process.env.SESSION_SECRET ||= 'attack-sim-secret-key-not-from-production-0001'

/**
 * 私信会话 id 路径参数健壮性回归（攻防 G5）。
 * 三个端点曾把 String(req.params.id) 原样传进 service，非数字 id 落进 SQL 的
 * `$1::bigint` 触发 500。现在 controller 层统一 parseConversationId，
 * 非法 id 一律按资源不存在（404）处理，不泄露路由格式、不制造 500。
 */
let db: PGlite
let app: RunningApp

async function call(path: string, method: string): Promise<{ status: number; text: string }> {
  const res = await app.request(path, {
    method,
    headers: {
      cookie: 'starpal_session=sess-valid',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'POST' ? JSON.stringify({ body: '合法消息正文' }) : undefined,
  })
  return { status: res.status, text: await res.text() }
}

before(async () => {
  db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  await db.exec(`INSERT INTO sessions (id, user_id, expires_at) VALUES ('sess-valid', 1, now() + interval '1 day')`)
  app = await startTestServer(db)
})

after(async () => {
  await app.close()
  await db.close()
})

describe('私信会话 id 校验（攻防 G5）', () => {
  it('GET /messages/abc/messages 非法 id 返回 404 而非 500', async () => {
    const r = await call('/api/messages/abc/messages', 'GET')
    assert.equal(r.status, 404, `非法 id 不应 500：${r.text.slice(0, 200)}`)
  })

  it('GET /messages/abc（会话详情）非法 id 返回 404 而非 500', async () => {
    const r = await call('/api/messages/abc', 'GET')
    assert.equal(r.status, 404, `非法 id 不应 500：${r.text.slice(0, 200)}`)
  })

  it('POST /messages/abc/messages 非法 id 返回 404 而非 500', async () => {
    const r = await call('/api/messages/abc/messages', 'POST')
    assert.equal(r.status, 404, `非法 id 不应 500：${r.text.slice(0, 200)}`)
  })

  it('bigint 越界 id 同样返回 404 而非 500', async () => {
    const r = await call(`/api/messages/${'9'.repeat(30)}/messages`, 'GET')
    assert.equal(r.status, 404, `越界 id 不应 500：${r.text.slice(0, 200)}`)
  })
})
