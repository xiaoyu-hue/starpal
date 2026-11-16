// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { ROLE_ADMIN } from '../../src/config/constants.js'
import { DomainError } from '../../src/shared/errors.js'
import {
  changeContentStatus,
  changeUserStatus,
  listAdminContent,
  listAdminUsers,
} from '../../src/modules/admin/admin.moderation.service.js'
import type { Executor } from '../../src/modules/admin/admin.types.js'
import { createMigratedDb, seedPost, seedUser } from '../helpers/db.js'

/**
 * M6-S3 用户与内容治理：
 * 1. 管理员可列出全部状态用户 / 内容，非管理员被服务层拒绝；
 * 2. 停用 / 恢复、移除 / 恢复都改变状态且各写一条动作正确的审核日志；
 * 3. 评论移除 / 恢复同步评论计数；removed 态 deleted_at 保持 NULL（不违反约束）；
 * 4. 目标不存在 / 不可翻转时抛 NOT_FOUND 且不写日志。
 */
describe('M6-S3 用户与内容管理', () => {
  let db: PGlite
  let ex: Executor
  const admin = { id: '99', role: ROLE_ADMIN }
  const outsider = { id: '1', role: 'member' }
  const listQuery = { cursor: null, limit: 50 }

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) }
    await seedUser(db, 1, 'alice')
    await seedUser(db, 2, 'bob')
    await seedUser(db, 99, 'root')
    await seedPost(db, 10, 1)
    await db.exec(`
      INSERT INTO comments (id, post_id, author_id, body) VALUES (20, 10, 2, '一条评论')
    `)
  })

  after(async () => {
    await db.close()
  })

  async function logsOf(action: string): Promise<number> {
    const r = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM moderation_logs WHERE action = $1`,
      [action],
    )
    return r.rows[0]!.n
  }

  it('非管理员列用户 / 内容均被拒绝（服务层纵深防御）', async () => {
    await assert.rejects(
      () => listAdminUsers(outsider, listQuery, ex),
      (e: unknown) => e instanceof DomainError && e.code === 'FORBIDDEN',
    )
    await assert.rejects(
      () => listAdminContent(outsider, 'post', listQuery, ex),
      (e: unknown) => e instanceof DomainError && e.code === 'FORBIDDEN',
    )
  })

  it('用户列表含全部状态，键集翻页正确', async () => {
    const page = await listAdminUsers(admin, { cursor: null, limit: 2 }, ex)
    assert.equal(page.items.length, 2)
    assert.equal(page.hasMore, true)
    assert.ok(page.nextCursor)
    const decoded = JSON.parse(Buffer.from(page.nextCursor!, 'base64url').toString('utf8'))
    const page2 = await listAdminUsers(
      admin,
      { cursor: { t: decoded.t, id: decoded.id }, limit: 2 },
      ex,
    )
    assert.equal(page2.items.length, 1)
    assert.equal(page2.hasMore, false)
  })

  it('停用用户改状态并写 user.suspend；恢复写 user.restore', async () => {
    const beforeLog = await logsOf('user.suspend')
    const item = await changeUserStatus(admin, 2, 'suspended', ex)
    assert.equal(item.status, 'suspended')
    const row = await db.query<{ status: string }>(`SELECT status FROM users WHERE id = 2`)
    assert.equal(row.rows[0]!.status, 'suspended')
    assert.equal(await logsOf('user.suspend'), beforeLog + 1)
    const log = await db.query<{ actor_id: string; target_id: string; action: string }>(
      `SELECT actor_id, target_id, action FROM moderation_logs WHERE action = 'user.suspend'`,
    )
    assert.equal(String(log.rows.at(-1)!.actor_id), '99')
    assert.equal(String(log.rows.at(-1)!.target_id), '2')

    const restored = await changeUserStatus(admin, 2, 'active', ex)
    assert.equal(restored.status, 'active')
    assert.equal(await logsOf('user.restore'), 1)
  })

  it('停用不存在用户抛 NOT_FOUND 且不写日志', async () => {
    const beforeLog = await logsOf('user.suspend')
    await assert.rejects(
      () => changeUserStatus(admin, 123456, 'suspended', ex),
      (e: unknown) => e instanceof DomainError && e.code === 'NOT_FOUND',
    )
    assert.equal(await logsOf('user.suspend'), beforeLog)
  })

  it('帖子移除 / 恢复：状态翻转、deleted_at 保持 NULL、写对应日志', async () => {
    const removed = await changeContentStatus(admin, 'post', 10, 'removed', ex)
    assert.equal(removed.status, 'removed')
    const row = await db.query<{ status: string; deleted_at: string | null }>(
      `SELECT status, deleted_at FROM posts WHERE id = 10`,
    )
    assert.equal(row.rows[0]!.status, 'removed')
    assert.equal(row.rows[0]!.deleted_at, null, 'removed 态不得带删除时间（违反 CHECK）')
    assert.equal(await logsOf('post.remove'), 1)

    // 已移除内容仍可被管理端列出。
    const list = await listAdminContent(admin, 'post', listQuery, ex)
    assert.ok(list.items.some((p) => p.id === 10 && p.status === 'removed'))

    const restored = await changeContentStatus(admin, 'post', 10, 'published', ex)
    assert.equal(restored.status, 'published')
    assert.equal(await logsOf('post.restore'), 1)
  })

  it('评论移除 / 恢复：计数联动、写对应日志', async () => {
    // 造出真实计数基线（seed 评论绕过业务，comment_count 初始为 0）。
    await db.exec(`UPDATE posts SET comment_count = 1 WHERE id = 10`)
    const removed = await changeContentStatus(admin, 'comment', 20, 'removed', ex)
    assert.equal(removed.status, 'removed')
    const dec = await db.query<{ comment_count: number }>(
      `SELECT comment_count FROM posts WHERE id = 10`,
    )
    assert.equal(dec.rows[0]!.comment_count, 0)
    assert.equal(await logsOf('comment.remove'), 1)

    const restored = await changeContentStatus(admin, 'comment', 20, 'published', ex)
    assert.equal(restored.status, 'published')
    const inc = await db.query<{ comment_count: number }>(
      `SELECT comment_count FROM posts WHERE id = 10`,
    )
    assert.equal(inc.rows[0]!.comment_count, 1)
    assert.equal(await logsOf('comment.restore'), 1)
  })

  it('移除不存在内容抛 NOT_FOUND 且不写日志', async () => {
    const beforeLog = await logsOf('post.remove')
    await assert.rejects(
      () => changeContentStatus(admin, 'post', 999999, 'removed', ex),
      (e: unknown) => e instanceof DomainError && e.code === 'NOT_FOUND',
    )
    assert.equal(await logsOf('post.remove'), beforeLog)
  })

  it('重复移除评论是幂等的：计数只减一次、日志只写一条', async () => {
    await db.exec(`UPDATE posts SET comment_count = 5 WHERE id = 10`)
    await changeContentStatus(admin, 'comment', 20, 'removed', ex)
    const logsAfterFirst = await logsOf('comment.remove')
    const again = await changeContentStatus(admin, 'comment', 20, 'removed', ex)
    assert.equal(again.status, 'removed')
    const cnt = await db.query<{ comment_count: number }>(
      `SELECT comment_count FROM posts WHERE id = 10`,
    )
    assert.equal(cnt.rows[0]!.comment_count, 4, '重复移除不应再次扣减计数')
    assert.equal(await logsOf('comment.remove'), logsAfterFirst, '重复移除不应重复写日志')
  })

  it('重复停用用户是幂等的：不重复写日志', async () => {
    await changeUserStatus(admin, 2, 'suspended', ex)
    const logsAfterFirst = await logsOf('user.suspend')
    const again = await changeUserStatus(admin, 2, 'suspended', ex)
    assert.equal(again.status, 'suspended')
    assert.equal(await logsOf('user.suspend'), logsAfterFirst, '重复停用不应重复写日志')
  })
})
