// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * P1 可见性漂移回归（攻防模拟 P1b / P1c）。
 *
 * 信息流用 VISIBLE 条件过滤了「作者被停用 / 话题被归档」的帖子，但详情与评论
 * 入口曾走另一套 authorize，只看 post.status，导致列表里消失的内容按 ID 仍可读、
 * 仍可评论——「停用违规账号 = 内容下线」的治理动作因此失效。
 *
 * 这里钉死两条链路（详情 GET / 评论 POST）与 VISIBLE 口径一致，
 * 同时确认管理员仍能复核被处理内容。全部走真 Express + PGlite。
 */
type Reply = { status: number; body: Record<string, unknown> | null; text: string }

let db: PGlite
let app: RunningApp
let topicId = 1

const activePost = 30 // 正常作者
const suspendedPost = 31 // 停用作者
const archivedPost = 32 // 归档话题下的正常帖子

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

  // 用户：1 正常作者、2 停用作者、3 评论者、99 管理员（role_id=2）。
  await seedUser(db, 1, 'good_author')
  await seedUser(db, 2, 'bad_author')
  await seedUser(db, 3, 'commenter')
  await seedUser(db, 99, 'root')
  await db.exec(`UPDATE users SET status = 'suspended' WHERE id = 2`)
  await db.exec(`UPDATE users SET role_id = 2 WHERE id = 99`)

  // 会话：评论者与管理员各一枚。
  await db.exec(`
    INSERT INTO sessions (id, user_id, expires_at) VALUES
      ('sess-commenter', 3, now() + interval '1 day'),
      ('sess-root', 99, now() + interval '1 day')
  `)

  app = await startTestServer(db)

  // 话题 id 从公开端点取，不写死；另造一个归档话题。
  const topics = await call('/api/topics')
  const payload = topics.body?.data as { items?: { id: number }[] } | { id: number }[] | undefined
  const list = Array.isArray(payload) ? payload : (payload?.items ?? [])
  topicId = list[0]?.id ?? 1
  const archived = await db.query<{ id: number }>(
    `INSERT INTO topics (name_zh, name_en, slug, deleted_at) VALUES ('归档话题', 'Archived', 'archived-topic', now()) RETURNING id`,
  )
  const archivedId = archived.rows[0]!.id

  // 三篇已发布帖子：正常作者、停用作者、归档话题。
  await db.query(
    `INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, status) VALUES
      ($1, 1, $2, '正常帖', '正文', '正文', 'published'),
      ($3, 2, $2, '停用作者帖', '正文', '正文', 'published')`,
    [activePost, topicId, suspendedPost],
  )
  await db.query(
    `INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, status)
     VALUES ($1, 1, $2, '归档话题帖', '正文', '正文', 'published')`,
    [archivedPost, archivedId],
  )
})

after(async () => {
  await app.close()
  await db.close()
})

describe('P1 详情可见性与列表口径一致', () => {
  it('正常帖：匿名按 ID 可读 200', async () => {
    const r = await call(`/api/posts/${activePost}`)
    assert.equal(r.status, 200, `正常帖应可读：${r.text.slice(0, 200)}`)
  })

  it('停用作者帖：匿名按 ID 直读按不存在处理 404', async () => {
    const r = await call(`/api/posts/${suspendedPost}`)
    assert.equal(r.status, 404, `停用作者帖不应可读：${r.text.slice(0, 200)}`)
  })

  it('归档话题帖：匿名按 ID 直读按不存在处理 404', async () => {
    const r = await call(`/api/posts/${archivedPost}`)
    assert.equal(r.status, 404, `归档话题帖不应可读：${r.text.slice(0, 200)}`)
  })

  it('管理员仍可复核停用作者帖 200（治理需要）', async () => {
    const r = await call(`/api/posts/${suspendedPost}`, {
      headers: { cookie: 'starpal_session=sess-root' },
    })
    assert.equal(r.status, 200, `管理员应能复核：${r.text.slice(0, 200)}`)
  })
})

describe('P1 评论入口与列表口径一致', () => {
  const cookie = 'starpal_session=sess-commenter'

  it('正常帖：登录用户可评论 200', async () => {
    const r = await call(
      `/api/posts/${activePost}/comments`,
      json('POST', { body: '正常评论内容' }, cookie),
    )
    assert.equal(r.status, 200, `正常帖应可评论：${r.text.slice(0, 200)}`)
  })

  it('停用作者帖：登录用户不可评论 404', async () => {
    const r = await call(
      `/api/posts/${suspendedPost}/comments`,
      json('POST', { body: '不该成功的评论' }, cookie),
    )
    assert.equal(r.status, 404, `停用作者帖不应可评论：${r.text.slice(0, 200)}`)
  })

  it('归档话题帖：登录用户不可评论 404', async () => {
    const r = await call(
      `/api/posts/${archivedPost}/comments`,
      json('POST', { body: '不该成功的评论' }, cookie),
    )
    assert.equal(r.status, 404, `归档话题帖不应可评论：${r.text.slice(0, 200)}`)
  })

  it('被拦截后库里未写入这些评论', async () => {
    const rows = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM comments WHERE body = '不该成功的评论'`,
    )
    assert.equal(rows.rows[0]!.n, 0, '被拒的评论不应落库')
  })
})
