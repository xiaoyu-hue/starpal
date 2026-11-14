// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { listLikedPosts } from '../../src/modules/posts/post.feed.repository.js'
import type { PostRow, RowExecutor } from '../../src/modules/posts/post.projection.js'
import { decodeCursor, encodeCursor } from '../../src/shared/pagination.js'
import { createMigratedDb } from '../helpers/db.js'

/**
 * 当前用户点赞列表的仓储 SQL（我的点赞）。
 *
 * 与收藏列表同构，用 PGlite 内存真库执行与线上同一段 SQL，覆盖四件容易写错的事：
 * 只返回本人点赞、按点赞时间倒序、过滤不可见帖子、键集游标翻页不重不漏。
 * 注入 executor 而非另写一份 SQL，避免「测试验证的是另一条查询」的假验证。
 * createMigratedDb 会执行含 010_likes_user_idx 的全部迁移，索引与线上一致。
 */
describe('当前用户点赞列表查询', () => {
  let db: PGlite
  let executor: RowExecutor

  before(async () => {
    db = await createMigratedDb()
    executor = { query: (sql, params) => db.query<PostRow>(sql, params) }

    await db.exec(`
      INSERT INTO users (id, username, password_hash, display_name) VALUES
        (1, 'alice', 'x', 'alice'),
        (2, 'bob',   'x', 'bob'),
        (3, 'carol', 'x', 'carol'),
        (4, 'dave',  'x', 'dave'),
        (5, 'erin',  'x', 'erin');
      UPDATE users SET status = 'suspended' WHERE id = 4;
      UPDATE users SET status = 'deleted'   WHERE id = 5;

      -- 归档话题 2，用于验证「话题归档后点赞不再可见」。
      UPDATE topics SET deleted_at = now() WHERE id = 2;

      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, status, deleted_at) VALUES
        (10, 3, 1, 'p10', '正文', '正文', 'published', NULL),
        (11, 3, 1, 'p11', '正文', '正文', 'published', NULL),
        (12, 3, 1, 'p12', '正文', '正文', 'published', NULL),
        (13, 3, 1, 'p13', '正文', '正文', 'published', NULL),
        (14, 5, 1, 'p14', '正文', '正文', 'published', NULL),
        (20, 3, 1, 'p20', '正文', '正文', 'draft',     NULL),
        (21, 3, 1, 'p21', '正文', '正文', 'removed',   NULL),
        (22, 3, 1, 'p22', '正文', '正文', 'deleted',   now()),
        (23, 4, 1, 'p23', '正文', '正文', 'published', NULL),
        (24, 3, 2, 'p24', '正文', '正文', 'published', NULL),
        (30, 3, 1, 'p30', '正文', '正文', 'published', NULL);

      INSERT INTO likes (user_id, post_id, created_at) VALUES
        (1, 10, '2024-01-01 10:00:00+00'),
        (1, 11, '2024-01-03 10:00:00+00'),
        (1, 12, '2024-01-03 10:00:00+00'),
        (1, 13, '2024-01-04 10:00:00+00'),
        (1, 14, '2024-01-05 10:00:00+00'),
        -- 以下 5 项均被 alice 点赞，但按可见性口径不应出现在列表里；
        -- 故意给更晚的点赞时间：一旦漏过滤就会排到最前面，断言立刻失败。
        (1, 20, '2024-01-06 10:00:00+00'),
        (1, 21, '2024-01-06 10:00:00+00'),
        (1, 22, '2024-01-06 10:00:00+00'),
        (1, 23, '2024-01-06 10:00:00+00'),
        (1, 24, '2024-01-06 10:00:00+00'),
        -- bob 的点赞：验证只查本人，且同一帖子被两人点赞不会放大结果集。
        (2, 30, '2024-01-06 10:00:00+00'),
        (2, 10, '2024-01-02 10:00:00+00');
    `)
  })

  after(async () => {
    await db.close()
  })

  function ids(rows: { id: number }[]): number[] {
    return rows.map((row) => row.id)
  }

  it('只返回本人且仍可见的点赞，按点赞时间倒序（同时间以 id 为第二键）', async () => {
    const page = await listLikedPosts('1', null, 20, executor)
    assert.deepEqual(ids(page.rows), [14, 13, 12, 11, 10])
    assert.equal(page.hasMore, false)
  })

  it('投影带出点赞时间，且已注销作者按占位署名呈现', async () => {
    const page = await listLikedPosts('1', null, 20, executor)
    const first = page.rows[0]!
    assert.equal(first.likedAt, '2024-01-05T10:00:00.000Z')
    const deletedAuthor = page.rows.find((row) => row.id === 14)!
    assert.equal(deletedAuthor.author.displayName, '已注销用户')
    assert.equal(deletedAuthor.author.avatarUrl, null)
  })

  it('键集游标翻页不重不漏：游标编解码往返后逐页拼接等于全量', async () => {
    const collected: number[] = []
    let cursor: { t: string; id: string } | null = null
    for (let step = 0; step < 5; step += 1) {
      const page = await listLikedPosts('1', cursor, 2, executor)
      collected.push(...ids(page.rows))
      const last = page.rows[page.rows.length - 1]
      if (!page.hasMore || !last?.likedAt) break
      // 模拟服务层：encodeCursor 生成 → decodeCursor 还原，再交给仓储翻下一页。
      const next = decodeCursor(
        encodeCursor({ t: last.likedAt, id: String(last.id) }),
      )
      assert.ok(next)
      cursor = next
    }
    assert.deepEqual(collected, [14, 13, 12, 11, 10])
  })

  it('换一个用户查询，只看到他自己的点赞', async () => {
    const page = await listLikedPosts('2', null, 20, executor)
    assert.deepEqual(ids(page.rows), [30, 10])
  })

  it('没有点赞的用户返回空页', async () => {
    const page = await listLikedPosts('999', null, 20, executor)
    assert.deepEqual(page.rows, [])
    assert.equal(page.hasMore, false)
  })
})
