// SPDX-License-Identifier: AGPL-3.0-or-later
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { parseSearchQuery } from '../../src/modules/search/search.schema.js'
import { search } from '../../src/modules/search/search.service.js'
import type { RowExecutor } from '../../src/modules/posts/post.projection.js'

/**
 * 搜索 M5-S3：PGlite 内存真库执行与线上同一段 SQL（复用 PROJECTION / VISIBLE）。
 *
 * 覆盖不靠猜的事实：
 * 1. 中文关键词命中标题 / 正文（ILIKE，非 tsvector 分词）；
 * 2. 可见性口径与信息流一致：草稿 / 已删除 / 停用作者 均被排除；
 * 3. 类型过滤：type=topic 只按话题名，type=post 不匹配话题名；
 * 4. 键集游标分页不重不漏；
 * 5. 空关键词短路返回空页；LIKE 通配符被转义（不把 % 当"匹配一切"）。
 */

describe('搜索 M5-S3', () => {
  let db: PGlite
  let ex: RowExecutor
  let topicName: string

  const authorId = 1

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) as never }

    await seedUser(db, authorId, 'alice')
    await seedUser(db, 3, 'suspended-user')

    const t = await db.query<{ name_zh: string }>('SELECT name_zh FROM topics WHERE id = 1')
    topicName = t.rows[0]!.name_zh

    // 显式 created_at，保证分页有稳定顺序（now() 同事务内相同，无法区分先后）。
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, status, deleted_at, created_at) VALUES
        (101, ${authorId}, 1, '泰拉瑞亚开荒心得', '挖矿与建造的快乐', '挖矿与建造的快乐', 'published', NULL, '2026-01-01T00:00:00Z'),
        (102, ${authorId}, 1, '普通帖子', '正文里藏着 泰拉瑞亚 这个词', '正文里藏着', 'published', NULL, '2026-01-02T00:00:00Z'),
        (103, ${authorId}, 1, '草稿不该被搜到', '泰拉瑞亚', '泰拉瑞亚', 'draft', NULL, '2026-01-03T00:00:00Z'),
        (104, ${authorId}, 1, '已删除不该被搜到', '泰拉瑞亚', '泰拉瑞亚', 'deleted', '2026-01-04T00:00:00Z', '2026-01-04T00:00:00Z'),
        (105, 3, 1, '停用作者的帖子', '泰拉瑞亚', '泰拉瑞亚', 'published', NULL, '2026-01-05T00:00:00Z'),
        (106, ${authorId}, 1, '分页关键词 A', '分页测试', '分页测试', 'published', NULL, '2026-02-01T00:00:00Z'),
        (107, ${authorId}, 1, '分页关键词 B', '分页测试', '分页测试', 'published', NULL, '2026-02-02T00:00:00Z'),
        (108, ${authorId}, 1, '分页关键词 C', '分页测试', '分页测试', 'published', NULL, '2026-02-03T00:00:00Z')
    `)
    await db.exec(`UPDATE users SET status = 'suspended' WHERE id = 3`)
  })

  async function run(raw: Record<string, unknown>) {
    return search(parseSearchQuery(raw), null, ex)
  }

  it('中文关键词命中标题', async () => {
    const page = await run({ q: '泰拉瑞亚' })
    // 101 标题命中、102 正文命中；103 草稿 / 104 已删除 / 105 停用作者 均排除。
    assert.deepEqual(page.items.map((i) => i.id).sort((a, b) => a - b), [101, 102])
  })

  it('中文关键词命中正文', async () => {
    const page = await run({ q: '挖矿' })
    assert.deepEqual(page.items.map((i) => i.id), [101])
  })

  it('可见性：草稿 / 已删除 / 停用作者 不出现在结果', async () => {
    const page = await run({ q: '不该被搜到' })
    assert.equal(page.items.length, 0)
    const suspended = await run({ q: '停用作者的帖子' })
    assert.equal(suspended.items.length, 0)
  })

  it('type=topic 只按话题名检索，type=post 不匹配话题名', async () => {
    const byTopic = await run({ q: topicName, type: 'topic' })
    assert.ok(byTopic.items.length >= 2, '话题名应命中该话题下的可见帖子')
    for (const item of byTopic.items) assert.equal(item.topic.nameZh, topicName)

    const byPost = await run({ q: topicName, type: 'post' })
    assert.equal(byPost.items.length, 0, '标题/正文不含话题名，type=post 应为空')
  })

  it('键集游标分页不重不漏', async () => {
    const first = await run({ q: '分页', limit: 2 })
    assert.deepEqual(first.items.map((i) => i.id), [108, 107])
    assert.equal(first.hasMore, true)
    assert.ok(first.nextCursor)

    const second = await run({ q: '分页', limit: 2, cursor: first.nextCursor })
    assert.deepEqual(second.items.map((i) => i.id), [106])
    assert.equal(second.hasMore, false)
    assert.equal(second.nextCursor, null)
  })

  it('空关键词短路返回空页', async () => {
    const page = await run({ q: '   ' })
    assert.deepEqual(page.items, [])
    assert.equal(page.nextCursor, null)
    assert.equal(page.hasMore, false)
  })

  it('LIKE 通配符被转义：% 不作为"匹配一切"', async () => {
    const page = await run({ q: '%' })
    assert.equal(page.items.length, 0, '无标题/正文含字面 % 时不应返回任何结果')
  })
})
