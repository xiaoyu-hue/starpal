// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request } from 'express'
import type { PGlite } from '@electric-sql/pglite'
import { subjectHashOf } from '../../src/modules/auth/index.js'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * 安全加固第一批回归（无新增依赖、无新增迁移）：
 * 1. 补齐的响应头确实出现在真实 HTTP 响应上，且不重复注入平台已有的 HSTS；
 * 2. 写接口复用认证那套「落库、不可逆来源摘要」限流，达到阈值返回 429；
 * 3. 限流按来源独立计数，不误伤正常请求、不串到其他来源。
 *
 * 用 x-forwarded-for 显式固定来源材料，避免测试机 IPv4/IPv6 回环差异造成假失败。
 */
const IP_A = '203.0.113.7'
const IP_B = '203.0.113.8'
const UA = 'security-hardening-test'
const SESSION_ID = 'sess-security-hardening'

function hashFor(ip: string, ua: string): string {
  return subjectHashOf({
    header: (name: string) => {
      const key = name.toLowerCase()
      if (key === 'x-forwarded-for') return ip
      if (key === 'user-agent') return ua
      return undefined
    },
    socket: { remoteAddress: undefined },
  } as unknown as Request)
}

let db: PGlite
let app: RunningApp

async function post(ip: string, ua = UA): Promise<Response> {
  return app.request('/api/posts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `starpal_session=${SESSION_ID}`,
      'x-forwarded-for': ip,
      'user-agent': ua,
    },
    body: JSON.stringify({ title: '安全加固测试帖', body: '正文内容', topicId: 1 }),
  })
}

/** 预置指定来源的 N 条发帖事件，模拟该来源已用满配额。 */
async function seedEvents(kind: 'post_create', ip: string, count: number): Promise<void> {
  const hash = hashFor(ip, UA)
  for (let i = 0; i < count; i++) {
    await db.query('INSERT INTO security_events (kind, subject_hash) VALUES ($1, $2)', [kind, hash])
  }
}

before(async () => {
  db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  await db.exec(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ('${SESSION_ID}', 1, now() + interval '1 day')`,
  )
  app = await startTestServer(db)
})

after(async () => {
  await app.close()
  await db.close()
})

describe('安全加固：响应头', () => {
  it('新增四道响应头存在，且 HSTS 不重复注入', async () => {
    const res = await app.request('/api/health')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-frame-options'), 'DENY')
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
    assert.equal(res.headers.get('x-permitted-cross-domain-policies'), 'none')
    assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin')
    assert.equal(res.headers.get('cross-origin-resource-policy'), 'same-origin')
    assert.match(res.headers.get('permissions-policy') ?? '', /geolocation=\(\)/)
    // 实测线上由 Vercel 注入 max-age=63072000；应用层再加会产生重复头。
    assert.equal(res.headers.get('strict-transport-security'), null)
  })
})

describe('安全加固：写接口限流', () => {
  it('未达阈值时正常发帖（201），不误伤真实用户', async () => {
    await db.exec('DELETE FROM security_events')
    const res = await post(IP_A)
    assert.equal(res.status, 201, (await res.text()).slice(0, 200))
  })

  it('达到阈值后同一来源发帖被拒（429）', async () => {
    await db.exec('DELETE FROM security_events')
    await seedEvents('post_create', IP_A, 20)
    const res = await post(IP_A)
    assert.equal(res.status, 429, (await res.text()).slice(0, 200))
  })

  it('另一来源不受影响，仍可正常发帖', async () => {
    await db.exec('DELETE FROM security_events')
    await seedEvents('post_create', IP_A, 20)
    const res = await post(IP_B)
    assert.equal(res.status, 201, (await res.text()).slice(0, 200))
  })
})
