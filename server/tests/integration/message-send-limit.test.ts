// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'
import { appEnv } from '../../src/config/env.js'

/**
 * D-1 私信写限流回归（攻防模拟 D-1）。
 *
 * 此前登录用户可无限连发私信骚扰。现在发送端点挂独立写限流
 * （MESSAGE_SEND_MAX 条 / MESSAGE_SEND_WINDOW_SECONDS 秒，默认 30/60），
 * 只拦短时间突发，正常密集聊天配额充足。
 *
 * 限流按来源摘要计数，故每次请求都带同一固定 XFF（取最右一跳为稳定来源），
 * 确保计数落在同一桶，避免测试假阴性。
 */
let db: PGlite
let app: RunningApp
const cookie = 'starpal_session=sess-mlimit'
const fixedXff = { 'x-forwarded-for': '198.51.100.7' }
let conversationId: string

async function send(body: string): Promise<{ status: number; text: string }> {
  const res = await app.request(`/api/messages/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie, ...fixedXff },
    body: JSON.stringify({ body }),
  })
  return { status: res.status, text: await res.text() }
}

before(async () => {
  db = await createMigratedDb()
  await seedUser(db, 1, 'sender')
  await seedUser(db, 2, 'receiver')
  await db.exec(`
    INSERT INTO sessions (id, user_id, expires_at) VALUES ('sess-mlimit', 1, now() + interval '1 day')
  `)
  app = await startTestServer(db)

  const res = await app.request('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie, ...fixedXff },
    body: JSON.stringify({ username: 'receiver' }),
  })
  const body = (await res.json()) as { data: { id: string } }
  conversationId = body.data.id
})

after(async () => {
  await app.close()
  await db.close()
})

describe('D-1 私信写限流', () => {
  // 三段断言合并为一个自包含用例：打满限流 → 用同一次运行的状态验证「被拦消息未落库」
  // 与「换来源不受影响」。这些断言依赖前面制造的满桶状态，拆成独立 it 会形成
  // 跨用例的隐式顺序依赖（一旦并发或拆分文件即失效），故放在同一 it 内、按语句顺序执行。
  it(`满桶后拦截、被拦消息不落库、换来源不受影响（${appEnv.messageSendMax} 条 / 窗口）`, async () => {
    // ① 连发打满：前 max 条成功，之后全部 429。
    const total = appEnv.messageSendMax + 5
    let ok = 0
    let limited = 0
    let firstLimitedAt = -1
    for (let i = 1; i <= total; i++) {
      const r = await send(`刷屏消息${i}`)
      if (r.status >= 200 && r.status < 300) ok++
      if (r.status === 429) {
        limited++
        if (firstLimitedAt < 0) firstLimitedAt = i
      }
    }
    assert.equal(ok, appEnv.messageSendMax, `前 ${appEnv.messageSendMax} 条应成功，实际 ${ok}`)
    assert.equal(limited, 5, `超出阈值后应全部 429，实际 ${limited}`)
    assert.equal(firstLimitedAt, appEnv.messageSendMax + 1, '第 31 条起应被拦')

    // ② 被 429 拦下的消息不应落库。
    const rows = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM messages WHERE body LIKE '刷屏消息%'",
    )
    assert.equal(rows.rows[0]!.n, appEnv.messageSendMax, '落库数应等于成功数')

    // ③ 换一个来源摘要（新 IP）仍是空桶，可正常发送。
    const res = await app.request(`/api/messages/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie,
        'x-forwarded-for': '198.51.100.99',
      },
      body: JSON.stringify({ body: '另一个来源的正常消息' }),
    })
    assert.equal(res.status, 200, `新来源应不受限：${(await res.text()).slice(0, 200)}`)
  })
})
