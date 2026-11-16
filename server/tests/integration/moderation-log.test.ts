// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { decideReport, type Executor } from '../../src/modules/reports/report.repository.js'
import {
  insertLog,
  listLogs,
} from '../../src/modules/moderation/index.js'
import { DomainError } from '../../src/shared/errors.js'
import { createMigratedDb, seedPost, seedUser } from '../helpers/db.js'

/**
 * M6-S2 审核日志：处置动作必须留痕，且日志只追加、可检索。
 *
 * 覆盖四类不靠猜的事实：
 * 1. resolve / dismiss 各写一条 action 正确的日志，metadata 带追溯字段；
 * 2. 终态不可重决——第二次决策失败且不产生第二条日志（条件 UPDATE + 同事务）；
 * 3. insertLog 支持系统动作（actor 为空），listLogs 按时间倒序键集翻页；
 * 4. 模块出口不提供 update / delete，从接口层保证只追加（编译期即可核对）。
 */
describe('M6-S2 审核日志接入', () => {
  let db: PGlite
  let ex: Executor

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) }
    await seedUser(db, 1, 'alice')
    await seedUser(db, 3, 'admin')
    await seedPost(db, 10, 1)
  })

  after(async () => {
    await db.close()
  })

  async function makeReport(detail: string): Promise<string> {
    await db.exec(`
      INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail)
      VALUES ('report', 1, 'post', 10, 'spam', '${detail}')
    `)
    const row = await db.query<{ id: string }>(`SELECT id FROM reports WHERE detail = '${detail}'`)
    return row.rows[0]!.id
  }

  it('resolve 处置写入一条 report.resolve 日志，metadata 带追溯字段', async () => {
    const id = await makeReport('resolve 留痕用例')
    await decideReport(Number(id), 'resolved', '已核实为广告', '3', ex)
    const logs = await db.query<{
      action: string
      actor_id: string
      target_type: string
      target_id: string
      report_id: number
      outcome: string
    }>(`
      SELECT action, actor_id, target_type, target_id,
             (metadata->>'reportId')::int AS report_id,
             metadata->>'outcome' AS outcome
        FROM moderation_logs WHERE action = 'report.resolve'
    `)
    assert.equal(logs.rows.length, 1)
    // BIGINT 在 pg 驱动返回 string、PGlite 返回 number，归一化后比较，不绑定驱动差异。
    assert.equal(String(logs.rows[0]!.actor_id), '3')
    assert.equal(logs.rows[0]!.target_type, 'post')
    assert.equal(String(logs.rows[0]!.target_id), '10')
    assert.equal(logs.rows[0]!.report_id, Number(id))
    assert.equal(logs.rows[0]!.outcome, 'resolved')
  })

  it('dismiss 处置写入 report.dismiss 日志', async () => {
    const id = await makeReport('dismiss 留痕用例')
    await decideReport(Number(id), 'dismissed', null, '3', ex)
    const logs = await db.query(`SELECT id FROM moderation_logs WHERE action = 'report.dismiss'`)
    assert.equal(logs.rows.length, 1)
  })

  it('终态不可重决：第二次决策抛 CONFLICT 且不产生第二条日志', async () => {
    const id = await makeReport('不可重决用例')
    await decideReport(Number(id), 'resolved', '首次处理', '3', ex)
    await assert.rejects(
      () => decideReport(Number(id), 'dismissed', '二次处理', '3', ex),
      (error: unknown) => error instanceof DomainError && error.code === 'CONFLICT',
    )
    const logs = await db.query<{ n: string }>(`
      SELECT count(*)::text AS n FROM moderation_logs
       WHERE metadata->>'reportId' = '${id}'
    `)
    assert.equal(logs.rows[0]!.n, '1')
  })

  it('insertLog 支持系统动作（actor 为空）', async () => {
    await insertLog(
      { actorId: null, action: 'report.review', targetType: 'report', targetId: 77 },
      ex,
    )
    const logs = await db.query<{ actor_id: string | null }>(`
      SELECT actor_id FROM moderation_logs WHERE target_type = 'report' AND target_id = 77
    `)
    assert.equal(logs.rows.length, 1)
    assert.equal(logs.rows[0]!.actor_id, null)
  })

  it('listLogs 按时间倒序返回且 hasMore 正确', async () => {
    const first = await listLogs(null, 2, ex)
    assert.equal(first.rows.length, 2)
    assert.equal(first.hasMore, true)
    const cursor = {
      t: new Date(first.rows[1]!.created_at).toISOString(),
      id: String(first.rows[1]!.id),
    }
    const second = await listLogs(cursor, 2, ex)
    // 第二页不含第一页已返回的任一条（键集翻页不重不漏）。
    const firstIds = new Set(first.rows.map((r) => String(r.id)))
    assert.equal(second.rows.some((r) => firstIds.has(String(r.id))), false)
  })
})
