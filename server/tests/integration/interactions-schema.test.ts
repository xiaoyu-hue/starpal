import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, expectRejected, migrationFiles, seedPost, seedUser } from '../helpers/db.js'

/**
 * 互动域数据模型（M4-S1）的结构级测试。
 * 断言对象是数据库自身：约束、级联、索引。服务层即使写错，也必须被这里挡住。
 */
describe('互动域迁移与约束', () => {
  let db: PGlite

  before(async () => {
    db = await createMigratedDb()
    await seedUser(db, 1, 'alice')
    await seedUser(db, 2, 'bob')
    await seedPost(db, 10, 1)
  })

  after(async () => {
    await db.close()
  })

  it('迁移文件按版本连续且全部可执行', () => {
    // 不硬编码完整版本列表：新增迁移不该让这条断言变成「改测试」的动作。
    // 真正要守住的是三条不变量——从 001 起、无缺口、无重复；排序后应与自然序号逐位相等。
    const versions = migrationFiles().map((name) => name.slice(0, 3)).sort()
    assert.ok(versions.length > 0, '未发现任何迁移文件')
    assert.equal(new Set(versions).size, versions.length, '迁移版本号存在重复')
    const sequential = versions.map((_, index) => String(index + 1).padStart(3, '0'))
    assert.deepEqual(versions, sequential, '迁移版本号须从 001 起连续，不得跳号')
  })

  it('四张互动表与关键索引均已建立', async () => {
    const tables = await db.query<{ name: string }>(
      `SELECT tablename AS name FROM pg_tables
       WHERE schemaname = 'public' AND tablename IN ('likes', 'bookmarks', 'comments', 'notifications')`,
    )
    assert.deepEqual(tables.rows.map((row) => row.name).sort(), [
      'bookmarks',
      'comments',
      'likes',
      'notifications',
    ])

    const indexes = await db.query<{ name: string }>(
      `SELECT indexname AS name FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname IN ('likes_post_idx', 'bookmarks_user_idx', 'comments_post_idx')`,
    )
    assert.equal(indexes.rows.length, 3)
  })

  describe('评论正文长度（2000 字符，Unicode 码点）', () => {
    const insertComment = (body: string): string =>
      `INSERT INTO comments (post_id, author_id, body) VALUES (10, 1, '${body}')`

    it('1000 字符可通过 —— 006 已放宽 005 的上限', async () => {
      await db.exec(insertComment('字'.repeat(1000)))
      const row = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM comments')
      assert.equal(row.rows[0]?.n, 1)
    })

    it('2000 字符正好通过', async () => {
      await db.exec(insertComment('字'.repeat(2000)))
    })

    it('2001 字符被拒', async () => {
      const message = await expectRejected(db, insertComment('字'.repeat(2001)))
      assert.match(message, /comments_body_length/)
    })

    it('emoji 按 1 个字符计，2000 个 emoji 可通过（不是按字节或 UTF-16 码元）', async () => {
      const emoji = '😀'.repeat(2000)
      // 前置断言：若按 UTF-16 码元计，这里会是 4000，必然超限。
      assert.equal(emoji.length, 4000)
      assert.equal(Array.from(emoji).length, 2000)
      await db.exec(insertComment(emoji))
    })

    it('纯空白评论被拒（空格 / 换行 / 制表符都不能绕过非空判定）', async () => {
      for (const blank of ['   ', '\n\n', '\t\t', ' \n\t\r\f\v ']) {
        let message = ''
        try {
          await db.query('INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3)', [
            10,
            1,
            blank,
          ])
        } catch (error) {
          message = error instanceof Error ? error.message : String(error)
        }
        assert.match(message, /comments_body_length/, `空白样本 ${JSON.stringify(blank)} 未被拒绝`)
      }
    })

    it('首尾空白不计入长度', async () => {
      await db.exec(insertComment(`${'  '}${'字'.repeat(2000)}${'  '}`))
    })
  })

  describe('点赞与收藏的唯一性', () => {
    it('同一用户重复点赞被主键拒绝', async () => {
      await db.exec('INSERT INTO likes (user_id, post_id) VALUES (1, 10)')
      const message = await expectRejected(db, 'INSERT INTO likes (user_id, post_id) VALUES (1, 10)')
      assert.match(message, /likes_pkey|duplicate key/)
    })

    it('同一用户重复收藏被主键拒绝', async () => {
      await db.exec('INSERT INTO bookmarks (user_id, post_id) VALUES (1, 10)')
      const message = await expectRejected(
        db,
        'INSERT INTO bookmarks (user_id, post_id) VALUES (1, 10)',
      )
      assert.match(message, /bookmarks_pkey|duplicate key/)
    })

    it('不同用户可对同一帖子各留一条', async () => {
      await db.exec('INSERT INTO likes (user_id, post_id) VALUES (2, 10)')
      const row = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM likes WHERE post_id = 10')
      assert.equal(row.rows[0]?.n, 2)
    })
  })

  describe('评论状态机与软删除一致性', () => {
    it('非法状态被拒', async () => {
      const message = await expectRejected(
        db,
        `INSERT INTO comments (post_id, author_id, body, status) VALUES (10, 1, '正文', 'hidden')`,
      )
      assert.match(message, /comments_status_valid/)
    })

    it('deleted 状态必须带 deleted_at', async () => {
      const message = await expectRejected(
        db,
        `INSERT INTO comments (post_id, author_id, body, status) VALUES (10, 1, '正文', 'deleted')`,
      )
      assert.match(message, /comments_deleted_consistent/)
    })

    it('deleted 状态带 deleted_at 可通过', async () => {
      await db.exec(
        `INSERT INTO comments (post_id, author_id, body, status, deleted_at)
         VALUES (10, 1, '正文', 'deleted', now())`,
      )
    })

    it('负数点赞数被拒', async () => {
      const message = await expectRejected(
        db,
        `INSERT INTO comments (post_id, author_id, body, like_count) VALUES (10, 1, '正文', -1)`,
      )
      assert.match(message, /comments_like_count_nonnegative/)
    })
  })

  describe('通知的类型与目标约束', () => {
    it('非法类型被拒', async () => {
      const message = await expectRejected(
        db,
        `INSERT INTO notifications (user_id, type) VALUES (1, 'follow')`,
      )
      assert.match(message, /notifications_type_valid/)
    })

    it('target_type 与 target_id 必须成对', async () => {
      const message = await expectRejected(
        db,
        `INSERT INTO notifications (user_id, type, target_type) VALUES (1, 'comment', 'post')`,
      )
      assert.match(message, /notifications_target_paired/)
    })
  })

  describe('级联与 SET NULL', () => {
    it('删除帖子后点赞、收藏、评论一并清空', async () => {
      await seedPost(db, 11, 1)
      await db.exec(`
        INSERT INTO likes (user_id, post_id) VALUES (1, 11);
        INSERT INTO bookmarks (user_id, post_id) VALUES (1, 11);
        INSERT INTO comments (post_id, author_id, body) VALUES (11, 1, '将被级联删除');
      `)
      await db.exec('DELETE FROM posts WHERE id = 11')

      const row = await db.query<{ likes: number; bookmarks: number; comments: number }>(
        `SELECT
           (SELECT count(*)::int FROM likes WHERE post_id = 11) AS likes,
           (SELECT count(*)::int FROM bookmarks WHERE post_id = 11) AS bookmarks,
           (SELECT count(*)::int FROM comments WHERE post_id = 11) AS comments`,
      )
      assert.deepEqual({ ...row.rows[0] }, { likes: 0, bookmarks: 0, comments: 0 })
    })

    it('触发者被删除后通知保留、actor_id 置 NULL', async () => {
      await seedPost(db, 12, 1)
      await db.exec(`
        INSERT INTO notifications (user_id, type, actor_id, target_type, target_id)
        VALUES (1, 'comment', 2, 'post', 12);
        DELETE FROM users WHERE id = 2;
      `)
      const row = await db.query<{ n: number; actors: number }>(
        `SELECT count(*)::int AS n, count(actor_id)::int AS actors
         FROM notifications WHERE user_id = 1 AND target_id = 12`,
      )
      assert.equal(row.rows[0]?.n, 1)
      assert.equal(row.rows[0]?.actors, 0)
    })

    it('接收者被删除后通知随之删除', async () => {
      await seedUser(db, 3, 'carol')
      await db.exec(`
        INSERT INTO notifications (user_id, type) VALUES (3, 'system');
        DELETE FROM users WHERE id = 3;
      `)
      const row = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM notifications WHERE user_id = 3',
      )
      assert.equal(row.rows[0]?.n, 0)
    })
  })
})
