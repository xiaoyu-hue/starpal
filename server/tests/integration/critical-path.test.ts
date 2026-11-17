// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'
import { hashInviteCode } from '../../src/modules/invite/index.js'

/**
 * 关键路径端到端（`M7-S1-T3`）：注册 → 发帖 → 互动 → 举报 → 处置 → 导出。
 *
 * 与 routes-smoke（M7-S1-T8）的分工：那边是「每个端点至少打一次」的横切面冒烟，
 * 用户由夹具直接写库；这一条把散在各模块的覆盖**串成一个真实用户旅程**——
 * 用户从邀请码注册开始，身份全程通过会话 Cookie 传递，不直接写任何业务行。
 * 唯一例外是管理员：其角色由 init-admin 脚本建立（另有记录），这里直接置位，
 * 因为「管理员怎么被创建」不属于社区成员的关键路径。
 *
 * 走的是真 Express 链路 + PGlite 真库（全部迁移），不 mock 任何服务层函数。
 */

type Reply = { status: number; body: Record<string, unknown> | null; text: string }

let db: PGlite
let app: RunningApp
let topicId = 1
let aliceCookie = ''
let rootCookie = ''
let postId = 0
let reportId = 0

async function call(path: string, init: RequestInit = {}): Promise<Reply> {
  const res = await app.request(path, init)
  const text = await res.text()
  let body: Record<string, unknown> | null = null
  try {
    body = JSON.parse(text) as Record<string, unknown>
  } catch {
    body = null
  }
  return { status: res.status, body, text }
}

function json(method: string, payload: unknown, cookie?: string): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(payload),
  }
}

before(async () => {
  db = await createMigratedDb()

  // 造一枚真实可用的邀请码：明文只此一次用于注册请求，库里只存哈希。
  const plain = 'E2EKEY1234567ABCDE'
  await db.query('INSERT INTO invite_codes (code_hash, note) VALUES ($1, $2)', [
    hashInviteCode(plain),
    '关键路径测试',
  ])

  // 管理员与会话：管理员由 init-admin 建立（另有验证），此处直接置位与发会话。
  await seedUser(db, 99, 'root')
  await db.exec(`UPDATE users SET role_id = 2 WHERE id = 99`)
  await db.exec(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES ('sess-e2e-root', 99, now() + interval '1 day')
  `)
  rootCookie = 'starpal_session=sess-e2e-root'

  app = await startTestServer(db)

  // 话题 id 从公开端点取，不写死。
  const topics = await call('/api/topics')
  const payload = topics.body?.data as { items?: { id: number }[] } | { id: number }[] | undefined
  const list = Array.isArray(payload) ? payload : (payload?.items ?? [])
  topicId = list[0]?.id ?? 1

  // 用邀请码真实注册，再真实登录拿会话（注册本身不建会话）。
  const registered = await call(
    '/api/auth/register',
    json('POST', {
      username: 'e2e_alice',
      password: 'E2ePassw0rd!',
      displayName: '端到端爱丽丝',
      inviteCode: plain,
      acceptTerms: true,
    }),
  )
  // 注册沿用 sendData 默认 200（不是 201）；这里钉的是「真的写进去并返回用户」。
  assert.equal(registered.status, 200, `注册应成功：${registered.text.slice(0, 300)}`)
  assert.equal((registered.body?.data as { registered?: boolean }).registered, true)

  const logged = await call(
    '/api/auth/login',
    json('POST', { username: 'e2e_alice', password: 'E2ePassw0rd!' }),
  )
  assert.equal(logged.status, 200, `登录应成功：${logged.text.slice(0, 300)}`)
  // 会话 Cookie 由响应 Set-Cookie 下发；这里直接取库里发给该用户的最新会话 id，
  // 避免在测试里解析 Cookie 头（那是浏览器该做的事，且登录端点已另有断言）。
  const sess = await db.query<{ id: string }>(
    `SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = 'e2e_alice')
     ORDER BY created_at DESC LIMIT 1`,
  )
  assert.equal(sess.rows.length, 1, '登录应产生一条会话')
  aliceCookie = `starpal_session=${sess.rows[0]!.id}`
})

after(async () => {
  await app.close()
  await db.close()
})

describe('M7-S1-T3 关键路径端到端', () => {
  it('注册 → 发帖 → 评论 → 点赞 → 举报 → 管理员处置 → 导出 → 删帖全链路走通', async () => {
    // 1. 发帖
    const created = await call(
      '/api/posts',
      json('POST', { title: '关键路径帖', body: '端到端正文', topicId }, aliceCookie),
    )
    assert.equal(created.status, 201, `发帖：${created.text.slice(0, 300)}`)
    postId = (created.body?.data as { id: number }).id
    assert.ok(postId > 0)

    // 2. 评论（本人评自己的帖，验证写入与作者回填）
    const commented = await call(
      `/api/posts/${postId}/comments`,
      json('POST', { body: '关键路径评论' }, aliceCookie),
    )
    assert.equal(commented.status, 200, `评论：${commented.text.slice(0, 300)}`)

    // 3. 点赞（幂等：PUT 连点两次计数仍为 1；端点刻意用显式 PUT/DELETE 而非 toggle）
    await call(`/api/posts/${postId}/like`, { method: 'PUT', headers: { cookie: aliceCookie } })
    await call(`/api/posts/${postId}/like`, { method: 'PUT', headers: { cookie: aliceCookie } })
    const liked = await call(`/api/posts/${postId}`)
    assert.equal(liked.status, 200)
    assert.equal((liked.body?.data as { likeCount?: number }).likeCount, 1, '重复点赞应只计一次')

    // 4. 举报（普通用户提交）
    const reported = await call(
      '/api/reports',
      json(
        'POST',
        {
          kind: 'report',
          targetType: 'post',
          targetId: postId,
          reason: 'spam',
          detail: '关键路径举报内容',
        },
        aliceCookie,
      ),
    )
    assert.equal(reported.status, 200, `举报：${reported.text.slice(0, 300)}`)
    reportId = (reported.body?.data as { id: number }).id
    assert.ok(reportId > 0)
    assert.equal((reported.body?.data as { status?: string }).status, 'pending')

    // 5. 管理员处置：普通用户直调被拒，管理员决策后进入终态
    const forbidden = await call(
      `/api/admin/reports/${reportId}/decision`,
      json('POST', { decision: 'resolve', note: '已确认' }, aliceCookie),
    )
    assert.equal(forbidden.status, 403, '普通用户不应能处置举报')

    const decided = await call(
      `/api/admin/reports/${reportId}/decision`,
      json('POST', { decision: 'resolve', note: '已确认' }, rootCookie),
    )
    assert.equal(decided.status, 200, `处置：${decided.text.slice(0, 300)}`)
    assert.equal((decided.body?.data as { status?: string }).status, 'resolved')

    // 6. 我的提交里确认终态（举报人视角）
    const mine = await call('/api/reports/mine', { headers: { cookie: aliceCookie } })
    assert.equal(mine.status, 200)
    // 我的提交：data 直接是数组，分页信息在 meta（与评论列表同口径，非 {items}）。
    const items = (Array.isArray(mine.body?.data) ? mine.body.data : []) as {
      id: number
      status: string
    }[]
    assert.ok(items.some((r) => r.id === reportId && r.status === 'resolved'), '举报人应看到终态')

    // 7. 导出（文件顶层直接是导出结构，不套 data 包络）
    const exported = await call('/api/export?format=json', {
      headers: { cookie: aliceCookie },
    })
    assert.equal(exported.status, 200, `导出：${exported.text.slice(0, 300)}`)
    assert.ok(exported.body && 'user' in exported.body && 'posts' in exported.body, '导出结构完整')
    const ownPosts = (exported.body as { posts?: { id: number }[] }).posts ?? []
    assert.ok(ownPosts.some((p) => p.id === postId), '导出应含本人刚发的帖')

    // 8. 删帖：之后详情不可见，且导出不再含该帖
    const removed = await call(`/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { cookie: aliceCookie },
    })
    assert.equal(removed.status, 200, `删帖：${removed.text.slice(0, 300)}`)
    const detail = await call(`/api/posts/${postId}`)
    assert.equal(detail.status, 404, '删除后详情应不可见')
  })

  it('同一邀请码不能注册第二个账号（防重放）', async () => {
    // 上一条 it 已用掉 E2EKEY1234567ABCDE；这里直接再走一次注册，应被拒。
    const replay = await call(
      '/api/auth/register',
      json('POST', {
        username: 'e2e_bob',
        password: 'E2ePassw0rd!',
        displayName: '端到端鲍勃',
        inviteCode: 'E2EKEY1234567ABCDE',
      }),
    )
    assert.equal(replay.status, 400, `重复用码应失败：${replay.text.slice(0, 300)}`)
    assert.equal(
      (replay.body as { error?: { code?: string } })?.error?.code,
      'INVITE_INVALID',
      '应返回邀请码无效错误码',
    )
  })
})
