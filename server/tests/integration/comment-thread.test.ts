// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { DomainError } from '../../src/shared/errors.js'
import {
  listComments,
  runInsertComment,
  runRemoveComment,
  type Executor,
  type Row,
} from '../../src/modules/comments/comment.repository.js'
import { createMigratedDb, seedPost, seedUser } from '../helpers/db.js'

/**
 * 评论的写入事务与可见性（M4-S3）。
 *
 * 重点不是「能插入一条评论」，而是三件容易在并发与复用中出错的事：
 * 计数与评论必须同生同灭、通知不能重复也不能自通知、移除后计数不得为负。
 */
describe('评论写入事务', () => {
  let db: PGlite
  let executor: Executor

  before(async () => {
    db = await createMigratedDb()
    executor = { query: (sql, params) => db.query<Row>(sql, params) }
    await seedUser(db, 1, 'author')
    await seedUser(db, 2, 'commenter')
    await seedUser(db, 3, 'third')
    await seedPost(db, 20, 1)
  })

  after(async () => {
    await db.close()
  })

  async function commentCount(postId: number): Promise<number> {
    const r = await db.query<{ n: number }>(
      'SELECT comment_count AS n FROM posts WHERE id = $1',
      [postId],
    )
    return r.rows[0]!.n
  }

  async function notifications(): Promise<{ user_id: string; actor_id: string | null }[]> {
    const r = await db.query<{ user_id: string; actor_id: string | null }>(
      'SELECT user_id, actor_id FROM notifications ORDER BY id',
    )
    return r.rows
  }

  it('插入评论后计数 +1，并给帖子作者写通知', async () => {
    const row = await runInsertComment(executor, 20, '2', '第一条评论')
    assert.equal(row.body, '第一条评论')
    assert.equal(await commentCount(20), 1)

    const list = await notifications()
    assert.equal(list.length, 1)
    // PGlite 的 BIGINT 映射为 number，生产 pg 驱动给字符串；统一转字符串再断言，
    // 避免测试锁定驱动细节而非业务语义。
    assert.equal(String(list[0]!.user_id), '1')
    assert.equal(String(list[0]!.actor_id), '2')

    const target = await db.query<{ type: string; target_type: string }>(
      'SELECT type, target_type FROM notifications',
    )
    assert.equal(target.rows[0]!.type, 'comment')
    assert.equal(target.rows[0]!.target_type, 'comment')
  })

  it('自己评论自己的帖子不产生通知，但计数照加', async () => {
    const before = (await notifications()).length
    await runInsertComment(executor, 20, '1', '作者自评')
    assert.equal((await notifications()).length, before)
    assert.equal(await commentCount(20), 2)
  })

  it('作者删除记 deleted 并带 deleted_at，计数 -1', async () => {
    const rows = await db.query<{ id: string }>(
      "SELECT id FROM comments WHERE body = '第一条评论'",
    )
    const id = Number(rows.rows[0]!.id)
    const postId = await runRemoveComment(executor, id, 'deleted')
    assert.equal(postId, 20)
    assert.equal(await commentCount(20), 1)

    const check = await db.query<{ status: string; deleted_at: Date | null }>(
      'SELECT status, deleted_at FROM comments WHERE id = $1',
      [id],
    )
    assert.equal(check.rows[0]!.status, 'deleted')
    assert.notEqual(check.rows[0]!.deleted_at, null)
  })

  it('管理员移除记 removed 且不带 deleted_at，计数 -1', async () => {
    const rows = await db.query<{ id: string }>(
      "SELECT id FROM comments WHERE body = '作者自评'",
    )
    const id = Number(rows.rows[0]!.id)
    await runRemoveComment(executor, id, 'removed')

    const check = await db.query<{ status: string; deleted_at: Date | null }>(
      'SELECT status, deleted_at FROM comments WHERE id = $1',
      [id],
    )
    assert.equal(check.rows[0]!.status, 'removed')
    assert.equal(check.rows[0]!.deleted_at, null)
    assert.equal(await commentCount(20), 0)
  })

  it('重复移除返回 null，且不会把计数扣成负数', async () => {
    const rows = await db.query<{ id: string }>(
      "SELECT id FROM comments WHERE body = '作者自评'",
    )
    const again = await runRemoveComment(executor, Number(rows.rows[0]!.id), 'removed')
    assert.equal(again, null)
    assert.equal(await commentCount(20), 0)
  })

  it('帖子不存在时不留下孤儿评论（事务整体回滚）', async () => {
    const before = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM comments')
    await assert.rejects(
      async () =>
        db.transaction(async (tx) => {
          const inner: Executor = { query: (sql, params) => tx.query<Row>(sql, params) }
          await runInsertComment(inner, 9999, '2', '幽灵评论')
        }),
      (error: unknown) => error instanceof DomainError && error.code === 'NOT_FOUND',
    )
    const after = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM comments')
    assert.equal(after.rows[0]!.n, before.rows[0]!.n)
  })
})

describe('评论列表的可见性与分页', () => {
  let db: PGlite
  let executor: Executor

  before(async () => {
    db = await createMigratedDb()
    executor = { query: (sql, params) => db.query<Row>(sql, params) }
    await seedUser(db, 1, 'owner')
    await seedUser(db, 2, 'writer')
    await seedPost(db, 30, 1)
    // 三条评论，时间拉开，避免同一 now() 造成游标边界不确定
    for (const [i, body] of ['最早', '居中', '最新'].entries()) {
      await db.query(
        `INSERT INTO comments (post_id, author_id, body, created_at)
         VALUES (30, 2, $1, now() - ($2 || ' minutes')::interval)`,
        [body, 10 - i * 2],
      )
    }
    await db.query("UPDATE posts SET comment_count = 3 WHERE id = 30")
  })

  after(async () => {
    await db.close()
  })

  it('按时间倒序返回，最新的在最前', async () => {
    const page = await listComments(executor, 30, false, null, 10)
    assert.deepEqual(page.rows.map((r) => r.body), ['最新', '居中', '最早'])
    assert.equal(page.hasMore, false)
  })

  it('游标分页不重复、不遗漏', async () => {
    const first = await listComments(executor, 30, false, null, 2)
    assert.equal(first.rows.length, 2)
    assert.equal(first.hasMore, true)
    const last = first.rows[1]!
    const second = await listComments(
      executor,
      30,
      false,
      { t: last.created_at.toISOString(), id: String(last.id) },
      2,
    )
    assert.deepEqual(second.rows.map((r) => r.body), ['最早'])
    assert.equal(second.hasMore, false)
  })

  it('被移除的评论对普通读者不可见，对管理员可见', async () => {
    await db.query("UPDATE comments SET status = 'removed' WHERE body = '居中'")
    const normal = await listComments(executor, 30, false, null, 10)
    assert.deepEqual(normal.rows.map((r) => r.body), ['最新', '最早'])

    const admin = await listComments(executor, 30, true, null, 10)
    assert.deepEqual(admin.rows.map((r) => r.body), ['最新', '居中', '最早'])
    assert.equal(admin.rows.find((r) => r.body === '居中')!.status, 'removed')
  })
})
