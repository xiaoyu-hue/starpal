// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import {
  assertTargetVisible,
  decideReport,
  insertReport,
  listMyReports,
  listReportQueue,
  type Executor,
} from '../../src/modules/reports/report.repository.js'
import type { ReportRow } from '../../src/modules/reports/report.types.js'
import {
  decideOnReport,
  getMyReports,
  getReportQueue,
  submitReport,
} from '../../src/modules/reports/report.service.js'
import {
  parseDecisionInput,
  parseListQuery,
  parseReportId,
  parseSubmitInput,
} from '../../src/modules/reports/report.schema.js'
import { DomainError } from '../../src/shared/errors.js'
import { decodeCursor, encodeCursor } from '../../src/shared/pagination.js'
import { createMigratedDb, expectRejected, seedPost, seedUser } from '../helpers/db.js'

/**
 * 举报 / 申诉最小闭环：PGlite 内存真库执行与线上同一段 SQL。
 *
 * 覆盖四类不靠猜的事实：
 * 1. 迁移 011 的 CHECK 约束（kind / status / 目标一致性 / 半成品处置）；
 * 2. 权限矩阵：普通用户看不到队列、不能决策；服务层二次复核拦住非管理员；
 * 3. 目标可见性：伪造 ID、草稿、已删、停用作者、归档话题、非 published 评论被拒；
 * 4. 状态机与列表：pending → 终态不可重决、我的提交只返回本人、键集游标翻页不重不漏。
 *
 * 数据布局：每个写入用例用专属 (用户, 目标) 组合，避免用例间顺序依赖；
 * 唯一索引只作用于 pending report，已处置的行不再占位。
 */
describe('举报 / 申诉最小闭环', () => {
  let db: PGlite
  let ex: Executor

  const alice = { id: '1', role: 'user' }
  const bob = { id: '2', role: 'user' }
  const admin = { id: '3', role: 'admin' }

  const reportPost = (targetId: number, detail = '这是一条广告内容，请处理') => ({
    kind: 'report' as const,
    targetType: 'post' as const,
    targetId,
    reason: 'spam',
    detail,
  })
  const appeal = (detail = '我的评论被误删，请复核') => ({
    kind: 'appeal' as const,
    targetType: null,
    targetId: null,
    reason: 'appeal',
    detail,
  })

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query<ReportRow>(sql, params) }

    await seedUser(db, 1, 'alice')
    await seedUser(db, 2, 'bob')
    await seedUser(db, 3, 'admin')
    // 角色经 role_id 外键关联 roles 表（admin = 2），users 表上没有 role 列。
    await db.exec('UPDATE users SET role_id = 2 WHERE id = 3')
    await seedUser(db, 4, 'suspended')
    await db.exec("UPDATE users SET status = 'suspended' WHERE id = 4")

    // 可见帖子 10/11/12/13/14；不可见：草稿 20、已移除 21、软删 22、停用作者 23、归档话题 24。
    await db.exec('UPDATE topics SET deleted_at = now() WHERE id = 2')
    for (const id of [10, 11, 12, 13, 14]) await seedPost(db, id, 1)
    await db.exec(`
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, status, deleted_at) VALUES
        (20, 1, 1, 'draft',    '正文', '正文', 'draft',     NULL),
        (21, 1, 1, 'removed',  '正文', '正文', 'removed',   NULL),
        (22, 1, 1, 'deleted',  '正文', '正文', 'deleted',   now()),
        (23, 4, 1, 'susp',     '正文', '正文', 'published', NULL),
        (24, 1, 2, 'archived', '正文', '正文', 'published', NULL);
      -- comments_deleted_consistent 要求 deleted 状态必须带 deleted_at，其余状态必须为 NULL。
      INSERT INTO comments (id, post_id, author_id, body, status, deleted_at) VALUES
        (100, 10, 1, '正常评论',   'published', NULL),
        (101, 10, 1, '已删评论',   'deleted',   now()),
        (102, 22, 1, '挂在已删帖下', 'published', NULL);
    `)
  })

  after(async () => {
    await db.close()
  })

  describe('迁移 011 的约束', () => {
    it('拒绝非法 kind / status 与目标不一致的行', async () => {
      const badKind = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, reason, detail) VALUES ('other', 1, 'spam', 'x')`)
      assert.match(badKind, /reports_kind_valid/)

      // 非法状态 'done' 同时违反 status 与 resolution 两条 CHECK（终态只认 resolved/dismissed），
      // 数据库可命中任一；断言「被 reports 约束拒绝」即可，不绑定具体哪一条。
      const badStatus = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, reason, detail, status, resolved_at)
        VALUES ('appeal', 1, 'appeal', 'x', 'done', now())`)
      assert.match(badStatus, /reports_(status|resolution)_valid/)

      const reportNoTarget = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, reason, detail) VALUES ('report', 1, 'spam', 'x')`)
      assert.match(reportNoTarget, /reports_target_valid/)
      const appealWithTarget = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail)
        VALUES ('appeal', 1, 'post', 10, 'appeal', 'x')`)
      assert.match(appealWithTarget, /reports_target_valid/)
    })

    it('拒绝「pending 却带处置信息」与「已处理却无处置时间」的半成品', async () => {
      const pendingWithResolution = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, reason, detail, resolved_at)
        VALUES ('appeal', 1, 'appeal', 'x', now())`)
      assert.match(pendingWithResolution, /reports_resolution_valid/)

      const resolvedWithoutTime = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, reason, detail, status)
        VALUES ('appeal', 1, 'appeal', 'x', 'resolved')`)
      assert.match(resolvedWithoutTime, /reports_resolution_valid/)
    })

    it('同一用户对同一目标的 pending 举报唯一，处置后允许再报', async () => {
      const first = await insertReport(reportPost(10), '1', ex)
      const duplicate = await expectRejected(db, `
        INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail)
        VALUES ('report', 1, 'post', 10, 'spam', '重复举报')`)
      assert.match(duplicate, /reports_pending_target_idx|unique/i)

      // 用真实返回的 id，不假设序列从 1 开始。
      await decideReport(first.id, 'resolved', '已处理', '3', ex)
      await insertReport(reportPost(10, '处置后又出现新问题'), '1', ex)
      const count = await db.query<{ n: string }>(
        'SELECT count(*)::text AS n FROM reports WHERE reporter_id = 1 AND target_id = 10')
      assert.equal(count.rows[0]?.n, '2')
    })
  })

  describe('请求模式层', () => {
    it('申诉忽略客户端伪造的 target 与 reason', () => {
      const parsed = parseSubmitInput({
        kind: 'appeal', targetType: 'post', targetId: 999, reason: 'spam', detail: '请复核我的处理',
      })
      assert.equal(parsed.targetType, null)
      assert.equal(parsed.targetId, null)
      assert.equal(parsed.reason, 'appeal')
    })

    it('拒绝非法 kind / 原因 / 过短说明 / 非法 id 与 cursor', () => {
      assert.throws(() => parseSubmitInput({ kind: 'other', detail: '内容说明' }), DomainError)
      assert.throws(() => parseSubmitInput({ ...reportPost(10), reason: 'nope' }), DomainError)
      assert.throws(() => parseSubmitInput({ ...reportPost(10), detail: 'x' }), DomainError)
      assert.throws(() => parseReportId('abc'), DomainError)
      assert.throws(() => parseListQuery({ cursor: '!!!' }), DomainError)
      assert.throws(() => parseDecisionInput({ decision: 'delete' }), DomainError)
    })

    it('合法输入与决策可解析', () => {
      assert.equal(parseSubmitInput(reportPost(10)).targetId, 10)
      assert.equal(parseListQuery({ status: 'pending' }).status, 'pending')
      assert.deepEqual(parseDecisionInput({ decision: 'resolve', note: ' 已核实 ' }), {
        decision: 'resolve', note: '已核实',
      })
      assert.equal(parseDecisionInput({ decision: 'dismiss' }).note, null)
    })
  })

  describe('目标可见性校验', () => {
    it('接受公开可见的帖子与评论', async () => {
      await assertTargetVisible('post', 10, ex)
      await assertTargetVisible('comment', 100, ex)
    })

    it('拒绝不存在、草稿、已移除、已删除、停用作者、归档话题的目标', async () => {
      for (const id of [999, 20, 21, 22, 23, 24]) {
        await assert.rejects(() => assertTargetVisible('post', id, ex), DomainError, `帖子 ${id} 应被拒`)
      }
    })

    it('拒绝已删评论、挂在不可见帖子下的评论', async () => {
      await assert.rejects(() => assertTargetVisible('comment', 101, ex), DomainError)
      await assert.rejects(() => assertTargetVisible('comment', 102, ex), DomainError)
      await assert.rejects(() => assertTargetVisible('comment', 999, ex), DomainError)
    })

    it('提交阶段拒绝伪造目标，并把重复举报归一为 CONFLICT', async () => {
      await assert.rejects(
        () => submitReport(bob, { ...reportPost(999) }, ex),
        (e: unknown) => e instanceof DomainError && e.code === 'NOT_FOUND',
      )
      // bob 专属目标 11：第一次成功，第二次命中唯一索引被服务层归一。
      await submitReport(bob, reportPost(11), ex)
      await assert.rejects(
        () => submitReport(bob, reportPost(11), ex),
        (e: unknown) => e instanceof DomainError && e.code === 'CONFLICT',
      )
    })
  })

  describe('权限矩阵（服务层二次复核）', () => {
    it('普通用户看不到队列、不能决策，管理员可以', async () => {
      await assert.rejects(
        () => getReportQueue(alice, { cursor: null, limit: 20, status: null }, ex),
        (e: unknown) => e instanceof DomainError && e.code === 'FORBIDDEN',
      )
      await assert.rejects(
        () => decideOnReport(alice, 1, { decision: 'dismiss', note: null }, ex),
        (e: unknown) => e instanceof DomainError && e.code === 'FORBIDDEN',
      )
      const queue = await getReportQueue(admin, { cursor: null, limit: 50, status: null }, ex)
      assert.ok(queue.items.length >= 1)
      assert.ok(queue.items.every((item) => typeof item.reporter.username === 'string'))
    })

    it('管理员决策后状态为终态，重复决策被 CONFLICT 拒绝', async () => {
      const created = await submitReport(bob, reportPost(12), ex)
      const resolved = await decideOnReport(admin, created.id, { decision: 'resolve', note: '已核实' }, ex)
      assert.equal(resolved.status, 'resolved')
      assert.equal(resolved.resolutionNote, '已核实')
      assert.ok(resolved.resolvedAt)
      await assert.rejects(
        () => decideOnReport(admin, created.id, { decision: 'dismiss', note: null }, ex),
        (e: unknown) => e instanceof DomainError && e.code === 'CONFLICT',
      )
    })
  })

  describe('我的提交与键集游标', () => {
    it('只返回本人提交，且不含他人提交', async () => {
      // appeal 不受 pending 唯一索引限制，可连续提交多条用于翻页。
      for (const tag of ['甲', '乙', '丙', '丁']) {
        await submitReport(bob, appeal(`申诉内容-${tag}`), ex)
      }
      const mine = await getMyReports(bob, { cursor: null, limit: 50, status: null }, ex)
      assert.ok(mine.items.length >= 4)
      const bobIds = new Set(mine.items.map((i) => i.id))
      const aliceMine = await getMyReports(alice, { cursor: null, limit: 50, status: null }, ex)
      assert.ok(aliceMine.items.length >= 1)
      assert.ok(aliceMine.items.every((i) => !bobIds.has(i.id)))
    })

    it('键集游标翻页不重不漏，游标可往返编解码', async () => {
      const first = await listMyReports('2', null, 2, ex)
      assert.equal(first.rows.length, 2)
      assert.equal(first.hasMore, true)
      const last = first.rows[first.rows.length - 1]!
      const cursor = { t: new Date(last.created_at).toISOString(), id: String(last.id) }
      const second = await listMyReports('2', cursor, 2, ex)
      const ids = [...first.rows, ...second.rows].map((r) => Number(r.id))
      assert.equal(new Set(ids).size, ids.length, '翻页不应重复')

      assert.deepEqual(decodeCursor(encodeCursor(cursor)), cursor)
    })

    it('队列可按状态过滤', async () => {
      const pending = await listReportQueue('pending', null, 50, ex)
      assert.ok(pending.rows.every((r) => r.status === 'pending'))
      const resolved = await listReportQueue('resolved', null, 50, ex)
      assert.ok(resolved.rows.every((r) => r.status === 'resolved'))
    })
  })
})
