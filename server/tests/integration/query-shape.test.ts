// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * 查询形状（`M7-S2-T3`）：证明「列表页不会随条目数增加数据库往返次数」。
 *
 * 为什么不用「数一遍代码里有几个 await」：那种审查只能证明写的时候长什么样，
 * 挡不住日后有人为了取作者信息在循环里补一次查询。这里直接数**真实经过连接池的
 * SQL 条数**：同一条请求，返回 5 条与 25 条时的往返次数必须相同。
 * 数字相等就说明没有「每行一次查询」，不等则说明有依赖数据量的查询被引进来了。
 *
 * 与之配套的索引支撑断言在同一文件下半部分：索引被误删时，往返次数不会变，
 * 只会悄悄变慢——所以需要单独一条结构断言。
 */

const COOKIE = (id: string) => `starpal_session=${id}`

let db: PGlite
let app: RunningApp
let topicId = 1

/** 执行一次请求并只统计这一次的 SQL 条数。 */
async function statementsOf(
  path: string,
  cookie?: string,
): Promise<{ count: number; texts: string[]; status: number; data: unknown }> {
  app.sqlLog.length = 0
  const res = await app.request(path, cookie ? { headers: { cookie } } : undefined)
  const texts = [...app.sqlLog]
  const text = await res.text()
  const body = text ? (JSON.parse(text) as { data?: unknown }) : {}
  return { count: texts.length, texts, status: res.status, data: body.data }
}

before(async () => {
  db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  await seedUser(db, 2, 'bob')
  await seedUser(db, 3, 'carol')
  await db.exec(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES ('sess-alice', 1, now() + interval '1 day'),
           ('sess-bob', 2, now() + interval '1 day')
  `)

  const topics = await db.query<{ id: number }>('SELECT id FROM topics ORDER BY id LIMIT 1')
  topicId = topics.rows[0]?.id ?? 1

  // 40 条帖子：用于「返回 5 条 vs 25 条」的往返对比
  await db.exec(`
    INSERT INTO posts (author_id, topic_id, title, body, excerpt, created_at)
    SELECT 2, ${topicId}, '帖子 ' || g, '正文 ' || g, '正文 ' || g,
           now() - (g || ' minutes')::interval
      FROM generate_series(1, 40) AS g
  `)
  // 两条详情帖：图片 1 张 vs 6 张，用于验证「取图不另起查询」
  await db.exec(`
    INSERT INTO posts (id, author_id, topic_id, title, body, excerpt)
    VALUES (500, 2, ${topicId}, '单图帖', '正文', '正文'),
           (501, 2, ${topicId}, '六图帖', '正文', '正文')
  `)
  await db.exec(`
    INSERT INTO post_images (post_id, storage_key, original_name, mime_type, width, height, byte_size, sort_order)
    SELECT 500, md5('img-500'), 'a.webp', 'image/webp', 1200, 800, 90000, 0
  `)
  await db.exec(`
    INSERT INTO post_images (post_id, storage_key, original_name, mime_type, width, height, byte_size, sort_order)
    SELECT 501, md5('img-501-' || s), 'a.webp', 'image/webp', 1200, 800, 90000, s
      FROM generate_series(0, 5) AS s
  `)
  // 评论：post 500 两条、post 501 十二条
  await db.exec(`
    INSERT INTO comments (post_id, author_id, body, created_at)
    SELECT 500, 1, '评论 ' || g, now() - (g || ' minutes')::interval FROM generate_series(1, 2) AS g
  `)
  await db.exec(`
    INSERT INTO comments (post_id, author_id, body, created_at)
    SELECT 501, 1, '评论 ' || g, now() - (g || ' minutes')::interval FROM generate_series(1, 12) AS g
  `)
  // 通知：alice 30 条、bob 2 条
  await db.exec(`
    INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, created_at)
    SELECT 1, 'like', 2, 'post', 500, now() - (g || ' minutes')::interval FROM generate_series(1, 30) AS g
  `)
  await db.exec(`
    INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, created_at)
    SELECT 2, 'like', 1, 'post', 500, now() - (g || ' minutes')::interval FROM generate_series(1, 2) AS g
  `)

  app = await startTestServer(db)
})

after(async () => {
  await app.close()
  await db.close()
})

describe('M7-S2-T3 列表往返次数与条目数无关（无 N+1）', () => {
  it('信息流：5 条与 25 条的 SQL 条数相同', async () => {
    const small = await statementsOf(`/api/posts?tab=latest&limit=5`)
    const large = await statementsOf(`/api/posts?tab=latest&limit=25`)
    assert.equal(small.status, 200)
    assert.equal(large.status, 200)
    assert.equal((small.data as unknown[]).length, 5)
    assert.equal((large.data as unknown[]).length, 25)
    // 计数为 0 说明统计链路本身失效（夹具没接上），此时「相等」毫无意义
    assert.ok(small.count > 0, 'SQL 计数为 0：统计链路未生效，下面的相等断言不成立')
    assert.equal(
      large.count,
      small.count,
      `信息流 SQL 条数随条目数增长（5 条 ${small.count} 次 / 25 条 ${large.count} 次），存在 N+1`,
    )
    assert.ok(small.count <= 3, `信息流单次请求 SQL 过多：${small.count} 条`)
  })

  it('信息流：热门与推荐两个 Tab 同样是常数条数', async () => {
    const popular = await statementsOf(`/api/posts?tab=popular&limit=5`)
    const recommended = await statementsOf(`/api/posts?tab=recommended&limit=25`)
    assert.equal(popular.status, 200)
    assert.equal(recommended.status, 200)
    assert.ok(
      Math.abs(popular.count - recommended.count) <= 1,
      `加权排序 Tab 的 SQL 条数不稳定（popular ${popular.count} / recommended ${recommended.count}）`,
    )
  })

  it('详情页：1 张图与 6 张图的 SQL 条数相同（图片一次取齐）', async () => {
    const one = await statementsOf('/api/posts/500')
    const six = await statementsOf('/api/posts/501')
    assert.equal(one.status, 200)
    const images = (six.data as { images: unknown[] }).images
    assert.equal(images.length, 6)
    assert.equal(
      six.count,
      one.count,
      `详情页 SQL 条数随图片数增长（1 图 ${one.count} 次 / 6 图 ${six.count} 次）`,
    )
  })

  it('评论线程：2 条与 12 条的 SQL 条数相同', async () => {
    const few = await statementsOf('/api/posts/500/comments')
    const many = await statementsOf('/api/posts/501/comments')
    assert.equal(few.status, 200)
    assert.equal(many.status, 200)
    assert.equal((many.data as unknown[]).length, 12)
    assert.equal(
      many.count,
      few.count,
      `评论列表 SQL 条数随条目数增长（2 条 ${few.count} 次 / 12 条 ${many.count} 次）`,
    )
  })

  it('通知列表：2 条与 30 条的 SQL 条数相同', async () => {
    const few = await statementsOf('/api/notifications?limit=5', COOKIE('sess-bob'))
    const many = await statementsOf('/api/notifications?limit=30', COOKIE('sess-alice'))
    assert.equal(few.status, 200)
    assert.equal(many.status, 200)
    assert.equal(
      many.count,
      few.count,
      `通知列表 SQL 条数随条目数增长（2 条 ${few.count} 次 / 30 条 ${many.count} 次）`,
    )
  })

  it('单次信息流请求只查一次 posts（出现两次以上通常意味着循环里发查询）', async () => {
    const { texts } = await statementsOf('/api/posts?tab=latest&limit=25')
    const postQueries = texts.filter((sql) => /FROM posts\b/i.test(sql))
    assert.ok(postQueries.length <= 1, `单次信息流请求里出现 ${postQueries.length} 次 posts 查询`)
  })
})

describe('M7-S2-T3 索引支撑（§7.4 与实际库一致）', () => {
  type IndexExpectation = { table: string; name: string; fragments: string[] }

  /** 与 ARCHITECTURE §7.4 索引策略表逐项对应；改索引必须同步改这里与文档。 */
  const EXPECTED: IndexExpectation[] = [
    { table: 'posts', name: 'posts_latest_idx', fragments: ['(created_at DESC, id DESC)', "status", 'deleted_at'] },
    { table: 'posts', name: 'posts_topic_idx', fragments: ['(topic_id, created_at DESC, id DESC)', 'status'] },
    { table: 'posts', name: 'posts_author_idx', fragments: ['(author_id, created_at DESC)'] },
    { table: 'posts', name: 'posts_popular_idx', fragments: ['(like_count DESC, created_at DESC)'] },
    { table: 'comments', name: 'comments_post_idx', fragments: ['(post_id, created_at DESC, id DESC)', 'status'] },
    { table: 'reports', name: 'reports_queue_idx', fragments: ['(status, created_at DESC, id DESC)'] },
    { table: 'reports', name: 'reports_mine_idx', fragments: ['(reporter_id, created_at DESC, id DESC)'] },
    { table: 'reports', name: 'reports_pending_target_idx', fragments: ['UNIQUE', '(reporter_id, target_type, target_id)'] },
    { table: 'notifications', name: 'notifications_user_idx', fragments: ['(user_id, created_at DESC, id DESC)'] },
    { table: 'notifications', name: 'notifications_unread_idx', fragments: ['(user_id, is_read, created_at DESC)', 'is_read = false'] },
    { table: 'messages', name: 'messages_conversation_idx', fragments: ['(conversation_id, created_at, id)'] },
    { table: 'security_events', name: 'security_events_lookup_idx', fragments: ['(kind, subject_hash, created_at DESC)'] },
  ]

  it('§7.4 要求的索引全部存在且列顺序正确', async () => {
    const result = await db.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`,
    )
    const defs = new Map(result.rows.map((row) => [row.indexname, row.indexdef]))
    for (const expect of EXPECTED) {
      const def = defs.get(expect.name)
      assert.ok(def, `缺少索引 ${expect.table}.${expect.name}（§7.4 要求）`)
      for (const fragment of expect.fragments) {
        assert.ok(
          def.includes(fragment),
          `索引 ${expect.name} 定义与预期不符，缺少片段 ${fragment}：${def}`,
        )
      }
    }
  })

  it('列表查询的排序方向都有索引可依（不依赖全表排序）', async () => {
    // 只断言「排序键被某个索引的列序列覆盖」，不锁定具体索引名：
    // 规划器选哪个索引是数据分布决定的，这里要守的是「有得选」。
    const plans: { sql: string; must: string }[] = [
      {
        sql: `EXPLAIN SELECT id FROM posts WHERE status = 'published' AND deleted_at IS NULL
              ORDER BY created_at DESC, id DESC LIMIT 21`,
        must: 'posts_latest_idx',
      },
      {
        sql: `EXPLAIN SELECT id FROM comments WHERE post_id = 1 AND status = 'published' AND deleted_at IS NULL
              ORDER BY created_at ASC, id ASC LIMIT 20`,
        must: 'comments_post_idx',
      },
      {
        sql: `EXPLAIN SELECT id FROM notifications WHERE user_id = 1 ORDER BY created_at DESC, id DESC LIMIT 20`,
        must: 'notifications_user_idx',
      },
    ]
    for (const plan of plans) {
      const result = await db.query<Record<string, string>>(plan.sql)
      const text = result.rows.map((row) => Object.values(row)[0]).join('\n')
      assert.ok(text.includes(plan.must), `查询未使用预期索引 ${plan.must}：\n${text}`)
    }
  })
})
