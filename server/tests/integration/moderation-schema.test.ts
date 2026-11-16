// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, expectRejected, seedPost, seedUser } from '../helpers/db.js'

/**
 * M6-S1 治理数据模型：PGlite 内存真库执行与线上同一段迁移。
 *
 * 覆盖四类不靠猜的事实：
 * 1. moderation_logs 的字段约束与 ON DELETE SET NULL（账号清理后日志仍留存）；
 * 2. moderation_public_log 视图只暴露三列，不含操作者 / 目标 ID / 内部信息；
 * 3. reports 放宽后的 CHECK：reviewing 状态与 user 目标可用，但半成品状态仍被拒；
 * 4. 历史约束未回退：伪造状态 / 目标形态仍被数据库拒绝。
 */
describe('M6-S1 治理数据模型', () => {
  let db: PGlite

  before(async () => {
    db = await createMigratedDb()
    await seedUser(db, 1, 'alice')
    await seedUser(db, 2, 'bob')
    await seedUser(db, 3, 'admin')
    await seedPost(db, 10, 1)
  })

  after(async () => {
    await db.close()
  })

  describe('moderation_logs 表约束', () => {
    it('接受一条完整日志，metadata 存为 JSONB', async () => {
      await db.exec(`
        INSERT INTO moderation_logs (actor_id, action, target_type, target_id, metadata)
        VALUES (3, 'post.remove', 'post', 10, '{"reason":"spam"}'::jsonb)
      `)
      const row = await db.query<{ action: string; reason: string }>(`
        SELECT action, metadata->>'reason' AS reason FROM moderation_logs WHERE target_id = 10
      `)
      assert.equal(row.rows.length, 1)
      assert.equal(row.rows[0]!.action, 'post.remove')
      assert.equal(row.rows[0]!.reason, 'spam')
    })

    it('允许 metadata 为空、actor_id 为空（系统动作）', async () => {
      await db.exec(`
        INSERT INTO moderation_logs (action, target_type, target_id)
        VALUES ('report.autoresolve', 'report', 1)
      `)
      const row = await db.query<{ actor_id: string | null; metadata: unknown }>(
        `SELECT actor_id, metadata FROM moderation_logs WHERE action = 'report.autoresolve'`,
      )
      assert.equal(row.rows.length, 1)
      assert.equal(row.rows[0]!.actor_id, null)
      assert.equal(row.rows[0]!.metadata, null)
    })

    it('空 action / 空 target_type 被 CHECK 拒绝', async () => {
      const msg1 = await expectRejected(db, `
        INSERT INTO moderation_logs (actor_id, action, target_type, target_id)
        VALUES (3, '   ', 'post', 10)
      `)
      assert.match(msg1, /moderation_logs_action_nonempty/)
      const msg2 = await expectRejected(db, `
        INSERT INTO moderation_logs (actor_id, action, target_type, target_id)
        VALUES (3, 'post.remove', '', 10)
      `)
      assert.match(msg2, /moderation_logs_target_nonempty/)
    })

    it('actor_id 不存在被外键拒绝', async () => {
      const msg = await expectRejected(db, `
        INSERT INTO moderation_logs (actor_id, action, target_type, target_id)
        VALUES (999999, 'post.remove', 'post', 10)
      `)
      assert.match(msg, /foreign key|violates/i)
    })

    it('操作者账号删除后日志保留、actor_id 置空（SET NULL 而非级联删除）', async () => {
      await db.exec(`
        INSERT INTO moderation_logs (actor_id, action, target_type, target_id)
        VALUES (2, 'comment.restore', 'comment', 1)
      `)
      await db.exec(`DELETE FROM users WHERE id = 2`)
      const row = await db.query<{ actor_id: string | null; action: string }>(`
        SELECT actor_id, action FROM moderation_logs WHERE action = 'comment.restore'
      `)
      assert.equal(row.rows.length, 1)
      assert.equal(row.rows[0]!.actor_id, null)
      assert.equal(row.rows[0]!.action, 'comment.restore')
    })
  })

  describe('moderation_public_log 脱敏视图', () => {
    it('只暴露 action / target_type / created_at 三列', async () => {
      const cols = await db.query<{ column_name: string }>(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'moderation_public_log' ORDER BY ordinal_position
      `)
      assert.deepEqual(
        cols.rows.map((r) => r.column_name),
        ['action', 'target_type', 'created_at'],
      )
    })

    it('公开视图不含操作者标识、目标 ID 与 metadata', async () => {
      const cols = await db.query<{ column_name: string }>(`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'moderation_public_log'
      `)
      const names = cols.rows.map((r) => r.column_name)
      assert.equal(names.includes('actor_id'), false)
      assert.equal(names.includes('target_id'), false)
      assert.equal(names.includes('metadata'), false)
    })

    it('公开视图能查到已写入的日志条目', async () => {
      const row = await db.query<{ action: string; target_type: string }>(
        `SELECT action, target_type FROM moderation_public_log WHERE action = 'post.remove'`,
      )
      assert.equal(row.rows.length, 1)
      assert.equal(row.rows[0]!.target_type, 'post')
    })
  })

  describe('reports 表放宽后的 CHECK', () => {
    it('reviewing 状态可写入，且三字段保持为空', async () => {
      await db.exec(`
        INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail, status)
        VALUES ('report', 1, 'post', 10, 'spam', '举报一条广告，进入复核', 'reviewing')
      `)
      const row = await db.query<{ status: string }>(`
        SELECT status FROM reports WHERE detail = '举报一条广告，进入复核'
      `)
      assert.equal(row.rows.length, 1)
      assert.equal(row.rows[0]!.status, 'reviewing')
    })

    it('reviewing 状态带 resolved_at 被 CHECK 拒绝（处理中不算处置完）', async () => {
      const msg = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail, status, resolved_at)
        VALUES ('report', 1, 'post', 10, 'spam', 'reviewing 半成品状态', 'reviewing', now())
      `)
      assert.match(msg, /reports_resolution_valid/)
    })

    it('user 目标类型可写入（不当行为举报指向账号）', async () => {
      await db.exec(`
        INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail)
        VALUES ('report', 1, 'user', 3, 'harassment', '该用户持续骚扰，请处理')
      `)
      const row = await db.query<{ target_type: string }>(`
        SELECT target_type FROM reports WHERE detail = '该用户持续骚扰，请处理'
      `)
      assert.equal(row.rows.length, 1)
      assert.equal(row.rows[0]!.target_type, 'user')
    })

    it('历史约束未回退：伪造状态被拒', async () => {
      const msg = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail, status)
        VALUES ('report', 1, 'post', 10, 'spam', '伪造状态', 'bogus')
      `)
      // bogus 同时违反 status 与 resolution 两条 CHECK，数据库可命中任一：
      // 断言「被 reports 约束拒绝」即可，不绑定具体哪一条。
      assert.match(msg, /reports_(status|resolution)_valid/)
    })

    it('历史约束未回退：举报缺目标被拒', async () => {
      const msg = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail)
        VALUES ('report', 1, NULL, NULL, 'spam', '举报缺目标')
      `)
      assert.match(msg, /reports_target_valid/)
    })

    it('历史约束未回退：申诉带目标被拒', async () => {
      const msg = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail)
        VALUES ('appeal', 1, 'post', 10, 'appeal', '申诉不该带目标')
      `)
      assert.match(msg, /reports_target_valid/)
    })
  })
})
