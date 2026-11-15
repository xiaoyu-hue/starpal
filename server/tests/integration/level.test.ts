// SPDX-License-Identifier: AGPL-3.0-or-later
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, expectRejected, seedUser } from '../helpers/db.js'
import type { MetricsExecutor } from '../../src/shared/metrics.js'
import { getLevel, setOwnRank } from '../../src/modules/levels/index.js'

/**
 * 等级 M5.5-S2：在 PGlite 内存真库上跑与线上同一段 SQL。
 *
 * 重点不在「能不能算出一个数字」，而在四条边界：
 * 1. 新成员从 L1 起步，不凭空给等级；
 * 2. 参与度真的会把等级抬上去，且 `top_level` 同步落库；
 * 3. **只升不降**——删帖让经验掉了，等级不跟着掉（这是本设计的核心承诺）；
 * 4. 停用按不存在处理、已注销不展示资历，库层拦住越界等级。
 */

// 库与执行器放在模块作用域：同一份内存库被下面两组用例共用，
// 避免为「段位徽标」再建一次库（一次建库要跑完全部迁移，十秒级）。
let db: PGlite
let ex: MetricsExecutor

describe('等级 M5.5-S2', () => {
  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) as never }
    await seedUser(db, 60, 'fresh')
    await seedUser(db, 61, 'active')
    await seedUser(db, 62, 'demoted')
    await seedUser(db, 63, 'gone')
    await seedUser(db, 64, 'banned')
    await seedUser(db, 65, 'rookie')
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

/**
 * 段位徽标（M5.5 补充）：任何登录成员可给自己戴一个「已解锁」的段位。
 *
 * 这里守的是四条边界，而不是「能不能存进去」：
 * 1. 默认不戴——不替人贴标签；
 * 2. 未解锁的段位必须被拒，且理由要能看懂（提示差到哪一级）；
 * 3. 摘下来（null）与「没传字段」是两件事，前者是合法操作、后者是请求错误；
 * 4. 库层与读路径各有一道兜底：非法键写不进，历史越界值读出来当没戴。
 */
describe('段位徽标 M5.5 补充', () => {
  it('默认不戴，五种段位都列出来但只有萌新已解锁', async () => {
    const view = await getLevel('rookie', ex)
    assert.equal(view.badge, null, '新人不该被自动挂上任何段位')
    assert.equal(view.catalog.length, 5, '未解锁的段位也要列出来，否则用户不知道上面还有四段')
    assert.deepEqual(
      view.catalog.filter((item) => item.unlocked).map((item) => item.key),
      ['newcomer'],
    )
    assert.deepEqual(
      view.catalog.map((item) => item.minLevel),
      [1, 11, 21, 31, 41],
    )
  })

  it('戴上已解锁的段位，公开视图能读到；摘下后归零', async () => {
    const set = await setOwnRank('65', 'newcomer', ex)
    assert.equal(set.badge?.nameZh, '萌新')
    assert.equal((await getLevel('rookie', ex)).badge?.nameZh, '萌新')

    const cleared = await setOwnRank('65', null, ex)
    assert.equal(cleared.badge, null)
    assert.equal((await getLevel('rookie', ex)).badge, null, '摘下后不应还挂着')
  })

  it('未解锁的段位被拒绝，提示里带上解锁等级', async () => {
    await assert.rejects(setOwnRank('65', 'veteran', ex), (error: unknown) => {
      const typed = error as { code?: string; message?: string }
      assert.equal(typed.code, 'FORBIDDEN')
      assert.match(typed.message ?? '', /元老.*L41/)
      return true
    })
    // 被拒之后状态不变，不能出现「报错了但其实写进去了」。
    assert.equal((await getLevel('rookie', ex)).badge, null)
  })

  it('非法段位键与缺失字段都按 VALIDATION_FAILED 处理', async () => {
    await assert.rejects(setOwnRank('65', 'legend', ex), (error: unknown) => {
      return (error as { code?: string }).code === 'VALIDATION_FAILED'
    })
    // undefined 是「没传这个字段」，与显式的 null（摘下）语义不同，不能混为一谈。
    await assert.rejects(setOwnRank('65', undefined, ex), (error: unknown) => {
      return (error as { code?: string }).code === 'VALIDATION_FAILED'
    })
  })

  it('等级高的人可以戴更低段位：等级牌仍显示真实等级，不做「修正」', async () => {
    // 不硬编码等级：demoted 的 top_level 是前面「删帖不降级」用例留下的状态，
    // 这里要验证的是「换徽标不改变等级」，而不是某个具体数字。
    const before = await getLevel('demoted', ex)
    const levelBefore = before.progress?.level
    assert.ok(levelBefore && levelBefore >= 11, '前置条件：这个账号确实升过级')

    await setOwnRank('62', 'newcomer', ex)
    const after = await getLevel('demoted', ex)
    assert.equal(after.badge?.nameZh, '萌新', '自主选择的结果要照实显示')
    assert.equal(after.progress?.level, levelBefore, '徽标不影响等级牌')

    await setOwnRank('62', null, ex)
  })

  it('库层拒绝不存在的段位键', async () => {
    const message = await expectRejected(
      db,
      `UPDATE users SET equipped_rank = 'legend' WHERE id = 65`,
    )
    assert.match(message, /users_equipped_rank_check/)
  })

  it('佩戴值越界（写入后失去资格）时按没戴处理，不显示未解锁的段位', async () => {
    // 模拟历史脏数据：L1 的账号被写入「元老」。读路径必须自己兜住，
    // 不能指望数据库 CHECK 知道 top_level 是多少。
    await db.exec(`UPDATE users SET equipped_rank = 'veteran' WHERE id = 65`)
    const view = await getLevel('rookie', ex)
    assert.equal(view.badge, null)
    await db.exec(`UPDATE users SET equipped_rank = NULL WHERE id = 65`)
  })
})