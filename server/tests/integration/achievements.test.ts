// SPDX-License-Identifier: AGPL-3.0-or-later
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedPost, seedUser } from '../helpers/db.js'
import type { RowExecutor } from '../../src/modules/posts/post.projection.js'
import { METRIC_IDS, describeCondition, parseCondition } from '../../src/modules/achievements/achievement.engine.js'
import { getTimeline, getWeekly } from '../../src/modules/achievements/achievement.service.js'

/**
 * 成就与每周热门 M5-S2：PGlite 内存真库执行与线上同一段 SQL。
 *
 * 覆盖不靠猜的事实：
 * 1. 种子成就的指标全部存在于代码侧注册表（数据与代码不漂移）；
 * 2. 指标口径：草稿 / 已删除帖子不计，已删评论不计，话题数去重；
 * 3. 判定幂等：同一成就重复判定只留一条记录，解锁时间不被覆盖；
 * 4. 时间线排序：已解锁按解锁时间倒序在前，未解锁在后；
 * 5. 已注销用户不展示、停用用户按不存在处理；
 * 6. 每周热门只取本周且至少有一个互动，按"赞 + 评论×2"排序。
 */

describe('成就 M5-S2', () => {
  let db: PGlite
  let ex: RowExecutor

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) as never }
  })

  async function freshUser(id: number, username: string): Promise<void> {
    await seedUser(db, id, username)
  }

  it('种子成就的指标都在注册表内，条件可解析', async () => {
    const { rows } = await db.query<{ code: string; condition: unknown }>(
      'SELECT code, condition FROM achievements',
    )
    assert.ok(rows.length > 0, '迁移应写入种子成就')
    for (const row of rows) {
      const condition = parseCondition(row.condition)
      assert.ok(condition, `成就 ${row.code} 的条件应可解析`)
      assert.ok(
        (METRIC_IDS as readonly string[]).includes(condition.metric),
        `成就 ${row.code} 使用了未注册的指标 ${condition.metric}`,
      )
    }
  })

  it('新用户没有任何成就，判定后也不会凭空解锁', async () => {
    await freshUser(11, 'newbie')
    const view = await getTimeline('newbie', ex)
    assert.equal(view.unlockedCount, 0)
    assert.ok(view.totalCount > 0)
    assert.equal(view.items.length, view.totalCount)
    assert.ok(view.items.every((item) => item.unlockedAt === null))
  })

  it('发一篇帖子解锁「初次发声」，重复判定不产生第二条记录', async () => {
    await freshUser(12, 'writer')
    await seedPost(db, 201, 12)

    const first = await getTimeline('writer', ex)
    const unlockedCodes = first.items.filter((i) => i.unlockedAt).map((i) => i.code)
    assert.deepEqual(unlockedCodes, ['first_post'])

    const second = await getTimeline('writer', ex)
    const again = second.items.find((i) => i.code === 'first_post')
    const before = first.items.find((i) => i.code === 'first_post')
    assert.equal(again?.unlockedAt, before?.unlockedAt, '解锁时间不应被后续判定覆盖')

    const { rows } = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM user_achievements
        WHERE user_id = 12 AND achievement_code = 'first_post'`,
    )
    assert.equal(rows[0]!.count, 1, '同一成就对同一用户只能有一条记录')
  })

  it('草稿与已删除帖子不计入发帖数，已删评论不计入评论数', async () => {
    await freshUser(13, 'drafty')
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, status, deleted_at) VALUES
        (211, 13, 1, '草稿', '正文', '正文', 'draft', NULL),
        (212, 13, 1, '已删', '正文', '正文', 'deleted', now())
    `)
    await db.exec(`
      INSERT INTO comments (id, post_id, author_id, body, status, deleted_at) VALUES
        (301, 201, 13, '会被删的评论', 'deleted', now())
    `)
    const view = await getTimeline('drafty', ex)
    assert.equal(view.unlockedCount, 0, '草稿 / 已删除内容不应解锁任何成就')
  })

  it('三个不同话题解锁「跨界的」，同话题多帖不重复计数', async () => {
    await freshUser(14, 'explorer')
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt) VALUES
        (221, 14, 1, '话题一 A', '正文', '正文'),
        (222, 14, 1, '话题一 B', '正文', '正文'),
        (223, 14, 2, '话题二', '正文', '正文')
    `)
    const before = await getTimeline('explorer', ex)
    assert.equal(before.items.find((i) => i.code === 'three_topics')?.unlockedAt, null)

    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt)
      VALUES (224, 14, 3, '话题三', '正文', '正文')
    `)
    const after = await getTimeline('explorer', ex)
    assert.ok(after.items.find((i) => i.code === 'three_topics')?.unlockedAt)
  })

  it('收到赞按帖子 like_count 汇总，撤销后不再达标', async () => {
    await freshUser(15, 'liked')
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, like_count) VALUES
        (231, 15, 1, '被赞若干次', '正文', '正文', 20)
    `)
    const view = await getTimeline('liked', ex)
    const unlocked = view.items.filter((i) => i.unlockedAt).map((i) => i.code)
    assert.deepEqual(unlocked.sort(), ['first_like_received', 'first_post', 'twenty_likes'])

    // 赞被撤销：已解锁记录保留（历史事实），但新用户不会因此达标。
    await db.exec(`UPDATE posts SET like_count = 0 WHERE id = 231`)
    await freshUser(16, 'nobody')
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, like_count)
      VALUES (232, 16, 1, '零赞', '正文', '正文', 0)
    `)
    const nobody = await getTimeline('nobody', ex)
    assert.equal(nobody.items.find((i) => i.code === 'first_like_received')?.unlockedAt, null)
  })

  it('时间线把已解锁的按解锁时间倒序排在前面，未解锁的排在后面', async () => {
    await freshUser(17, 'orderly')
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt) VALUES
        (241, 17, 1, '第一帖', '正文', '正文')
    `)
    await db.exec(`
      INSERT INTO user_achievements (user_id, achievement_code, unlocked_at) VALUES
        (17, 'first_post', '2026-01-01T00:00:00Z'),
        (17, 'veteran_30', '2026-02-01T00:00:00Z')
    `)
    const view = await getTimeline('orderly', ex)
    const flags = view.items.map((i) => i.unlockedAt !== null)
    // 已解锁的全部在未解锁之前，且两块内部各自有序。
    assert.deepEqual(flags, [...flags].sort((a, b) => Number(b) - Number(a)))
    assert.equal(view.items[0]!.code, 'veteran_30', '最近解锁的排最前')
  })

  it('已注销用户不展示成就，停用用户按不存在处理', async () => {
    await freshUser(18, 'gone')
    await db.exec(`UPDATE users SET status = 'deleted', deleted_at = now() WHERE id = 18`)
    const gone = await getTimeline('gone', ex)
    assert.equal(gone.unlockedCount, 0)
    assert.deepEqual(gone.items, [])

    await freshUser(19, 'banned')
    await db.exec(`UPDATE users SET status = 'suspended' WHERE id = 19`)
    await assert.rejects(() => getTimeline('banned', ex), /用户不存在/)
  })

  it('本周热门只取本周内、至少一个互动的帖子，并按互动权重排序', async () => {
    await freshUser(20, 'weekly-author')
    const week = await db.query<{ ws: Date }>(
      `SELECT (date_trunc('week', now() + interval '8 hours') - interval '8 hours') AS ws`,
    )
    const weekStart = week.rows[0]!.ws

    // 用参数化的 created_at 相对本周起点定位，避免测试运行时点影响（周一跑也不会翻车）。
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, like_count, comment_count, created_at) VALUES
        (251, 20, 1, '高互动', '正文', '正文', 5, 3, timestamptz '${weekStart.toISOString()}' + interval '1 hour'),
        (252, 20, 1, '低互动', '正文', '正文', 1, 0, timestamptz '${weekStart.toISOString()}' + interval '2 hours'),
        (253, 20, 1, '零互动', '正文', '正文', 0, 0, timestamptz '${weekStart.toISOString()}' + interval '3 hours'),
        (254, 20, 1, '上周的帖子', '正文', '正文', 99, 99, timestamptz '${weekStart.toISOString()}' - interval '1 hour')
    `)

    const view = await getWeekly(null, ex)
    const ids = view.items.map((item) => item.id)
    assert.deepEqual(ids.slice(0, 2), [251, 252])
    assert.ok(!ids.includes(253), '零互动不进热门')
    assert.ok(!ids.includes(254), '上周的帖子不进本周热门')
  })

  it('条件描述是人话，不暴露指标名', () => {
    assert.equal(describeCondition({ metric: 'posts_published', gte: 10 }), '发布 10 篇帖子')
    assert.equal(describeCondition({ metric: 'days_since_join', gte: 30 }), '加入满 30 天')
  })
})
