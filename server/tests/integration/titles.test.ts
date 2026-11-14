// SPDX-License-Identifier: AGPL-3.0-or-later
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, expectRejected, seedPost, seedUser } from '../helpers/db.js'
import {
  findOwnProfileById,
  findPublicProfileByUsername,
  updateTitles,
} from '../../src/modules/users/user.repository.js'
import { updateOwnTitles } from '../../src/modules/users/user.service.js'
import { DomainError } from '../../src/shared/errors.js'
import { mapRow } from '../../src/modules/posts/post.projection.js'
import { toItem } from '../../src/modules/comments/comment.service.js'
import type { Executor } from '../../src/modules/users/user.repository.js'

/**
 * 头衔系统 M5.5-S1：PGlite 内存真库执行与线上同一段 SQL。
 *
 * 覆盖四类不靠猜的事实：
 * 1. 迁移 012 的 CHECK 约束：非法头衔 id 被拒，合法数组可落库；
 * 2. 权限矩阵：仅管理员可写，普通用户写头衔被拒（FORBIDDEN）；
 * 3. 取值校验：非数组、非法 id、重复 id 被拒或归一；
 * 4. 投影贯通：公开 / 本人资料投影含 titles，帖子与评论作者署名透传 titles。
 *
 * 业务函数统一接收 PGlite 执行器（ex），与线上连接池走同一段 SQL，避免「测试另写一份」。
 */
describe('头衔系统 M5.5-S1', () => {
  let db: PGlite
  let ex: Executor

  const adminId = '2'
  const adminName = 'solvyre'
  const aliceId = '1'

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) as never }

    await seedUser(db, Number(aliceId), 'alice')
    await seedUser(db, Number(adminId), adminName)
    // 该用户在迁移之后才建，需显式提升为管理员；迁移回填只作用于迁移时已存在的 admin。
    await db.exec(`UPDATE users SET role_id = 2 WHERE id = ${adminId}`)
    await seedPost(db, 1, Number(adminId))
  })

  it('迁移 012 约束：非法头衔 id 被拒', async () => {
    const msg = await expectRejected(
      db,
      "INSERT INTO users (id, username, password_hash, display_name, titles) VALUES (99, 'bad', 'x', 'bad', ARRAY['not_a_title'])",
    )
    assert.match(msg, /users_titles_check/i)
  })

  it('迁移 012 约束：合法头衔数组可落库', async () => {
    await db.exec(
      "INSERT INTO users (id, username, password_hash, display_name, titles) VALUES (98, 'ok', 'x', 'ok', ARRAY['founder','admin'])",
    )
    const row = await db.query<{ titles: string[] }>(
      'SELECT titles FROM users WHERE id = 98',
    )
    assert.deepEqual(row.rows[0]!.titles.sort(), ['admin', 'founder'])
  })

  it('仅管理员可写头衔，普通用户被拒', async () => {
    await assert.rejects(
      () => updateOwnTitles(aliceId, 'user', { titles: ['founder'] }, ex),
      (err: unknown) => err instanceof DomainError && err.code === 'FORBIDDEN',
    )
    // 即便绕过前端，服务层仍二次复核：普通角色即便传了合法请求也被拒。
    await assert.rejects(
      () => updateOwnTitles(aliceId, 'user', { titles: ['admin'] }, ex),
      (err: unknown) => err instanceof DomainError && err.code === 'FORBIDDEN',
    )
  })

  it('非数组 / 非法 id 被拒为 VALIDATION_FAILED', async () => {
    await assert.rejects(
      () => updateOwnTitles(adminId, 'admin', { titles: 'founder' }, ex),
      (err: unknown) => err instanceof DomainError && err.code === 'VALIDATION_FAILED',
    )
    await assert.rejects(
      () => updateOwnTitles(adminId, 'admin', { titles: ['nope'] }, ex),
      (err: unknown) => err instanceof DomainError && err.code === 'VALIDATION_FAILED',
    )
  })

  it('重复 id 归一、顺序与首次出现一致（服务层去重）', async () => {
    const profile = await updateOwnTitles(
      adminId,
      'admin',
      { titles: ['admin', 'founder', 'admin', 'community_leader'] },
      ex,
    )
    assert.deepEqual(profile.titles, ['admin', 'founder', 'community_leader'])
  })

  it('本人资料投影含 titles，且无头衔时为空数组', async () => {
    await updateTitles(adminId, ['community_leader'], ex)
    const own = await findOwnProfileById(adminId, ex)
    assert.deepEqual(own!.titles, ['community_leader'])

    const fresh = await findOwnProfileById(aliceId, ex)
    assert.deepEqual(fresh!.titles, [])
  })

  it('公开资料投影含 titles', async () => {
    await updateTitles(adminId, ['founder', 'admin'], ex)
    const pub = await findPublicProfileByUsername(adminName, ex)
    assert.deepEqual(pub!.titles.sort(), ['admin', 'founder'])
  })

  it('帖子作者署名透传 titles', () => {
    const row = {
      id: '1',
      title: '测试帖',
      excerpt: '正文',
      body: '正文',
      status: 'published',
      like_count: 0,
      comment_count: 0,
      bookmark_count: 0,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
      author_id: adminId,
      topic_id: 1,
      topic_slug: 'general',
      topic_name: '综合',
      username: adminName,
      display_name: 'Solvyre',
      author_status: 'active',
      author_titles: ['founder', 'community_leader'],
      avatar_url: null,
      images: [],
    }
    const mapped = mapRow(row as never)
    assert.deepEqual(mapped.author.titles, ['founder', 'community_leader'])
    // 已注销作者的头衔降级为空数组（与署名占位一致）。
    const erased = mapRow({ ...row, author_status: 'deleted' } as never)
    assert.deepEqual(erased.author.titles, [])
  })

  it('评论作者署名透传 titles，已注销降级为空', () => {
    const row = {
      id: '1',
      post_id: '1',
      body: '顶',
      status: 'published',
      created_at: new Date('2026-01-01T00:00:00Z'),
      author_id: adminId,
      username: adminName,
      display_name: 'Solvyre',
      author_status: 'active',
      author_titles: ['admin'],
      avatar_url: null,
    }
    assert.deepEqual(toItem(row as never, null).author.titles, ['admin'])
    assert.deepEqual(toItem({ ...row, author_status: 'deleted' } as never, null).author.titles, [])
  })
})
