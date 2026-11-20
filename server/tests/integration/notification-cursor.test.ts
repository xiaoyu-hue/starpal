// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * P4 畸形游标健壮性回归（攻防模拟 P4）。
 *
 * 通知列表曾把 `?t=abc&id=1` 原样拼进 `$2::timestamptz`，触发类型转换错误 → 500。
 * 修法是在 controller 解析层校验游标合法性，非法即退化为第一页（null），
 * 不破坏前端裸参数契约。这里钉死：畸形参数返回 200 且拿到第一页数据。
 */
let db: PGlite
let app: RunningApp
const cookie = 'starpal_session=sess-ncursor'
let iso: string

async function get(path: string): Promise<{ status: number; text: string; body: Record<string, unknown> | null }> {
  const res = await app.request(path, { headers: { cookie } })
  const text = await res.text()
  let body: Record<string, unknown> | null = null
  try {
    body = JSON.parse(text) as Record<string, unknown>
  } catch {
    body = null
  }
  return { status: res.status, text, body }
}

before(async () => {
  db = await createMigratedDb()
  await seedUser(db, 1, 'recipient')
  await db.exec(`
    INSERT INTO sessions (id, user_id, expires_at) VALUES ('sess-ncursor', 1, now() + interval '1 day');
    INSERT INTO notifications (user_id, type, created_at) VALUES
      (1, 'system', now() - interval '2 minutes'),
      (1, 'system', now() - interval '1 minute');
  `)
  app = await startTestServer(db)
  const first = await get('/api/notifications')
  const items = (first.body?.data as { items?: { createdAt: string }[] })?.items ?? []
  iso = items[0]?.createdAt ?? new Date().toISOString()
})

after(async () => {
  await app.close()
  await db.close()
})

describe('P4 通知游标健壮性', () => {
  it('畸形时间串 ?t=abc&id=1 返回 200 而非 500，且退化为第一页', async () => {
    const r = await get('/api/notifications?t=abc&id=1')
    assert.equal(r.status, 200, `畸形时间串不应 500：${r.text.slice(0, 200)}`)
    const items = (r.body?.data as { items?: unknown[] })?.items ?? []
    assert.equal(items.length, 2, '退化为第一页应拿到全部 2 条')
  })

  it('畸形 id ?t=<合法>&id=abc 返回 200 且退化为第一页', async () => {
    const r = await get(`/api/notifications?t=${encodeURIComponent(iso)}&id=abc`)
    assert.equal(r.status, 200, `畸形 id 不应 500：${r.text.slice(0, 200)}`)
    const items = (r.body?.data as { items?: unknown[] })?.items ?? []
    assert.equal(items.length, 2)
  })

  it('时间串为空 ?t=&id=1 返回 200（视为无游标）', async () => {
    const r = await get('/api/notifications?t=&id=1')
    assert.equal(r.status, 200, `空时间串不应 500：${r.text.slice(0, 200)}`)
  })

  it('超长 id（bigint 越界）返回 200 且退化为第一页（攻防 B6）', async () => {
    const r = await get(`/api/notifications?t=${encodeURIComponent(iso)}&id=${'9'.repeat(30)}`)
    assert.equal(r.status, 200, `bigint 越界 id 不应 500：${r.text.slice(0, 200)}`)
    const items = (r.body?.data as { items?: unknown[] })?.items ?? []
    assert.equal(items.length, 2)
  })

  it('合法游标仍正常工作 200', async () => {
    const r = await get(`/api/notifications?t=${encodeURIComponent(iso)}&id=1`)
    assert.equal(r.status, 200, `合法游标应正常：${r.text.slice(0, 200)}`)
  })
})
