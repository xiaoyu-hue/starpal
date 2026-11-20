// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

process.env.DATABASE_URL ||= 'postgres://local/local'
process.env.SESSION_SECRET ||= 'attack-sim-secret-key-not-from-production-0001'

/**
 * 互动可见性回归（攻防 C1 / C2）。
 *
 * 帖子详情已按 P1 口径把「作者被停用 / 话题被归档」的帖子按不存在处理，
 * 但点赞 / 收藏入口的 assertInteractable 只看 post.status/deleted_at，
 * 导致不可见帖子仍能点赞收藏，露出「存在」信号并让治理下线内容产生互动。
 * 这里钉死两条互动入口与 VISIBLE 口径一致；正常帖应仍可互动（防误伤）。
 */
let db: PGlite
let app: RunningApp
let topicId = 1

const activePost = 40
const suspendedPost = 41
const archivedPost = 42

async function call(path: string, init: RequestInit = {}): Promise<{ status: number; text: string }> {
  const res = await app.request(path, init)
  return { status: res.status, text: await res.text() }
}

before(async () => {
  db = await createMigratedDb()
  await seedUser(db, 1, 'author')
  await seedUser(db, 2, 'suspended_author')
  await seedUser(db, 3, 'voter')
  await db.exec(`UPDATE users SET status = 'suspended' WHERE id = 2`)
  await db.exec(`INSERT INTO sessions (id, user_id, expires_at) VALUES ('sess-voter', 3, now() + interval '1 day')`)

  app = await startTestServer(db)

  const topics = await call('/api/topics')
  const payload = JSON.parse(topics.text)?.data
  const list = Array.isArray(payload) ? payload : (payload?.items ?? [])
  topicId = list[0]?.id ?? 1
  const archived = await db.query<{ id: number }>(
    `INSERT INTO topics (name_zh, name_en, slug, deleted_at) VALUES ('归档话题I', 'ArchivedI', 'archived-i', now()) RETURNING id`,
  )
  const archivedId = archived.rows[0]!.id

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

const voter: RequestInit = { headers: { cookie: 'starpal_session=sess-voter' } }

describe('互动入口与 VISIBLE 口径一致（攻防 C1/C2）', () => {
  it('正常帖可点赞 / 收藏（防误伤）', async () => {
    assert.equal((await call(`/api/posts/${activePost}/like`, { method: 'PUT', ...voter })).status, 200)
    assert.equal((await call(`/api/posts/${activePost}/bookmark`, { method: 'PUT', ...voter })).status, 200)
  })

  it('停用作者帖点赞 / 收藏按 404 处理', async () => {
    assert.equal((await call(`/api/posts/${suspendedPost}/like`, { method: 'PUT', ...voter })).status, 404)
    assert.equal((await call(`/api/posts/${suspendedPost}/bookmark`, { method: 'PUT', ...voter })).status, 404)
  })

  it('归档话题帖点赞 / 收藏按 404 处理', async () => {
    assert.equal((await call(`/api/posts/${archivedPost}/like`, { method: 'PUT', ...voter })).status, 404)
    assert.equal((await call(`/api/posts/${archivedPost}/bookmark`, { method: 'PUT', ...voter })).status, 404)
  })
})
