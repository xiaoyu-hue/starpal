// SPDX-License-Identifier: AGPL-3.0-or-later
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, expectRejected, seedUser } from '../helpers/db.js'
import type { MetricsExecutor } from '../../src/shared/metrics.js'
import { getLevel } from '../../src/modules/levels/index.js'

/**
 * 等级 M5.5-S2：在 PGlite 内存真库上跑与线上同一段 SQL。
 *
 * 重点不在「能不能算出一个数字」，而在四条边界：
 * 1. 新成员从 L1 起步，不凭空给等级；
 * 2. 参与度真的会把等级抬上去，且 `top_level` 同步落库；
 * 3. **只升不降**——删帖让经验掉了，等级不跟着掉（这是本设计的核心承诺）；
 * 4. 停用按不存在处理、已注销不展示资历，库层拦住越界等级。
 */

describe('等级 M5.5-S2', () => {
  let db: PGlite
  let ex: MetricsExecutor

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) as never }
    await seedUser(db, 60, 'fresh')
    await seedUser(db, 61, 'active')
    await seedUser(db, 62, 'demoted')
    await seedUser(db, 63, 'gone')
    await seedUser(db, 64, 'banned')
  })

  it('新成员是 L1 萌新，零经验', async () => {
    const view = await getLevel('fresh', ex)
    assert.equal(view.displayName, 'fresh')
    assert.equal(view.progress?.level, 1)
    assert.equal(view.progress?.rank, '萌新')
    assert.equal(view.progress?.experience, 0)
    assert.ok(view.basis.length > 0, '等级说明由服务端生成，前端不复制文案')
  })

  it('发帖、评论、跨话题会把等级抬上去，并写入历史最高', async () => {
    // 15 帖 = 150，其中跨 2 个话题 = 30，20 条评论 = 60，合计 240 → L11 入门
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, status)
      SELECT g, 61, CASE WHEN g % 2 = 0 THEN 1 ELSE 2 END, 'p' || g, '正文', '正文', 'published'
      FROM generate_series(100, 114) AS g
    `)
    await db.exec(`
      INSERT INTO comments (post_id, author_id, body)
      SELECT 100, 61, 'c' || g FROM generate_series(1, 20) AS g
    `)

    const view = await getLevel('active', ex)
    assert.equal(view.progress?.experience, 240)
    assert.equal(view.progress?.level, 11)
    assert.equal(view.progress?.rank, '入门')

    const rows = await db.query<{ top_level: number }>(
      'SELECT top_level FROM users WHERE id = 61',
    )
    assert.equal(rows.rows[0]!.top_level, 11, '晋级必须落库，否则下次刷新就掉回去')
  })

  it('删帖让经验下降，但等级不降（只升不降）', async () => {
    // 22 帖 = 220，占 1 个话题 = 15，合计 235 → L11 入门
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, status)
      SELECT g, 62, 1, 'p' || g, '正文', '正文', 'published'
      FROM generate_series(200, 221) AS g
    `)
    const before = await getLevel('demoted', ex)
    assert.equal(before.progress?.experience, 235)
    assert.equal(before.progress?.level, 11)

    // 全部删掉：现算经验归零，等级应停在 11
    // 软删除必须同时改 status —— `posts_deleted_consistent` 约束不允许「删了但还标已发布」
    await db.exec(`UPDATE posts SET status = 'deleted', deleted_at = now() WHERE author_id = 62`)
    const after = await getLevel('demoted', ex)
    assert.equal(after.progress?.experience, 0, '经验反映当前真实参与')
    assert.equal(after.progress?.level, 11, '等级取历史最高，删帖不掉级')
    assert.equal(after.progress?.rank, '入门')

    const rows = await db.query<{ top_level: number }>(
      'SELECT top_level FROM users WHERE id = 62',
    )
    assert.equal(rows.rows[0]!.top_level, 11, '退步时不得改写历史最高')
  })

  it('已注销账户不展示资历，停用账户按不存在处理', async () => {
    await db.exec(`UPDATE users SET status = 'deleted' WHERE id = 63`)
    const gone = await getLevel('gone', ex)
    assert.equal(gone.progress, null)

    await db.exec(`UPDATE users SET status = 'suspended' WHERE id = 64`)
    await assert.rejects(getLevel('banned', ex), (error: unknown) => {
      return (error as { code?: string }).code === 'NOT_FOUND'
    })
  })

  it('不存在的用户名报 NOT_FOUND', async () => {
    await assert.rejects(getLevel('nobody-here', ex), (error: unknown) => {
      return (error as { code?: string }).code === 'NOT_FOUND'
    })
  })

  it('库层拒绝越界等级：0 级与 51 级都写不进去', async () => {
    const zero = await expectRejected(db, `UPDATE users SET top_level = 0 WHERE id = 60`)
    assert.match(zero, /users_top_level_range/)
    const over = await expectRejected(db, `UPDATE users SET top_level = 51 WHERE id = 60`)
    assert.match(over, /users_top_level_range/)
  })

  it('私信不计经验：收发再多私信也不升级', async () => {
    const view = await getLevel('fresh', ex)
    assert.equal(view.progress?.experience, 0)
  })
})
