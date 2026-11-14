// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { DomainError } from '../../src/shared/errors.js'
import {
  runToggle,
  type Executor,
  type Row,
  type ToggleSpec,
} from '../../src/modules/interactions/interaction.repository.js'
import { createMigratedDb, seedPost, seedUser } from '../helpers/db.js'

/**
 * 点赞 / 收藏的计数事务（M4-S2）。
 * 覆盖三件容易写错的事：重复请求必须幂等、计数不得为负、帖子不存在时不得留下孤儿记录。
 * 并发写入的正确性由 SQL 语义保证（唯一约束 + 单条 UPDATE），此处验证其串行等价行为。
 */
const LIKE: ToggleSpec = { table: 'likes', column: 'like_count' }
const BOOKMARK: ToggleSpec = { table: 'bookmarks', column: 'bookmark_count' }

describe('点赞与收藏的计数事务', () => {
  let db: PGlite
  let executor: Executor

  before(async () => {
    db = await createMigratedDb()
    executor = { query: (sql, params) => db.query<Row>(sql, params) }
    await seedUser(db, 1, 'alice')
    await seedUser(db, 2, 'bob')
    await seedPost(db, 10, 1)
  })

  after(async () => {
    await db.close()
  })

  async function countOf(table: 'likes' | 'bookmarks', postId: number): Promise<number> {
    const result = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM ${table} WHERE post_id = $1`,
      [postId],
    )
    return result.rows[0]!.n
  }

  it('首次点赞：计数 1，明细 1 行', async () => {
    assert.equal(await runToggle(executor, 10, '1', true, LIKE), 1)
    assert.equal(await countOf('likes', 10), 1)
  })

  it('重复点赞幂等：计数仍为 1，不产生第二行', async () => {
    assert.equal(await runToggle(executor, 10, '1', true, LIKE), 1)
    assert.equal(await countOf('likes', 10), 1)
  })

  it('第二个用户点赞：计数 2', async () => {
    assert.equal(await runToggle(executor, 10, '2', true, LIKE), 2)
    assert.equal(await countOf('likes', 10), 2)
  })

  it('取消点赞：计数回落，明细减少', async () => {
    assert.equal(await runToggle(executor, 10, '2', false, LIKE), 1)
    assert.equal(await countOf('likes', 10), 1)
  })

  it('重复取消幂等：计数不再下降，也不出现负数', async () => {
    assert.equal(await runToggle(executor, 10, '2', false, LIKE), 1)
    assert.equal(await countOf('likes', 10), 1)
  })

  it('计数与明细不一致时取消，GREATEST 兜住 0 而不写负值', async () => {
    await db.query('UPDATE posts SET like_count = 0 WHERE id = 10')
    assert.equal(await runToggle(executor, 10, '1', false, LIKE), 0)
    const row = await db.query<{ like_count: number }>('SELECT like_count FROM posts WHERE id = 10')
    assert.equal(row.rows[0]?.like_count, 0)
  })

  it('收藏与点赞互不影响', async () => {
    assert.equal(await runToggle(executor, 10, '1', true, BOOKMARK), 1)
    const row = await db.query<{ like_count: number; bookmark_count: number }>(
      'SELECT like_count, bookmark_count FROM posts WHERE id = 10',
    )
    assert.deepEqual({ ...row.rows[0] }, { like_count: 0, bookmark_count: 1 })
  })

  it('对不存在的帖子点赞抛 NOT_FOUND，且不留孤儿明细', async () => {
    await assert.rejects(
      () => runToggle(executor, 9999, '1', true, LIKE),
      (error: unknown) => error instanceof DomainError && error.code === 'NOT_FOUND',
    )
    assert.equal(await countOf('likes', 9999), 0)
  })
})
