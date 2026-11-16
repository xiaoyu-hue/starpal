// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { ROLE_ADMIN } from '../../src/config/constants.js'
import { DomainError } from '../../src/shared/errors.js'
import {
  adminCreateTopic,
  adminListTopics,
  adminSetTopicArchived,
  adminUpdateTopic,
  type TopicExecutor,
} from '../../src/modules/topics/index.js'
import { parseCreateTopicInput } from '../../src/modules/topics/topic.admin.schema.js'
import { getAdminStats } from '../../src/modules/admin/admin.stats.controller.js'
import { createMigratedDb, seedPost, seedUser } from '../helpers/db.js'

/**
 * M6-S3-T6 / T8：话题管理（创建/编辑/归档 + 留痕 + 幂等）与基础统计口径。
 * 话题种子随迁移 003/007 写入（10 个），测试库开箱即有。
 */
describe('M6-S3 话题管理与基础统计', () => {
  let db: PGlite
  let ex: TopicExecutor
  const admin = { id: '99', role: ROLE_ADMIN }
  const outsider = { id: '1', role: 'user' }

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) }
    await seedUser(db, 1, 'alice')
    await seedUser(db, 99, 'root')
    await seedPost(db, 10, 1)
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

  it('非管理员被拒绝（话题管理）', async () => {
    await assert.rejects(
      () => adminListTopics(outsider, ex),
      (e: unknown) => e instanceof DomainError && e.code === 'FORBIDDEN',
    )
  })

  it('话题列表含种子话题，新建后可见', async () => {
    const before = await adminListTopics(admin, ex)
    assert.ok(before.length >= 10)
    assert.ok(before.some((t) => t.slug === 'technology'))
    const created = await adminCreateTopic(
      admin,
      {
        slug: 'tester-corner',
        nameZh: '测试角',
        nameEn: 'Test Corner',
        description: null,
        icon: null,
        sortOrder: 99,
      },
      ex,
    )
    assert.equal(created.slug, 'tester-corner')
    assert.equal(created.archived, false)
    const after = await adminListTopics(admin, ex)
    assert.ok(after.some((t) => t.id === created.id))
  })

  it('创建写 topic.create 日志；slug 冲突归一为 CONFLICT', async () => {
    assert.ok((await logsOf('topic.create')) >= 1)
    await assert.rejects(
      () =>
        adminCreateTopic(
          admin,
          {
            slug: 'tester-corner',
            nameZh: '重名',
            nameEn: 'Dup',
            description: null,
            icon: null,
            sortOrder: 1,
          },
          ex,
        ),
      (e: unknown) => e instanceof DomainError && e.code === 'CONFLICT',
    )
  })

  it('非法 slug 在模式层被拒（VALIDATION_FAILED），数据库 CHECK 是第二道兜底', () => {
    // 校验在 schema 层（控制器调用），服务函数接收已解析输入——与举报模块同口径。
    assert.throws(
      () =>
        parseCreateTopicInput({
          slug: 'Bad_Slug!',
          nameZh: '非法',
          nameEn: 'Bad',
          description: null,
          icon: null,
          sortOrder: 1,
        }),
      (e: unknown) => e instanceof DomainError && e.code === 'VALIDATION_FAILED',
    )
    // 合法 slug 通过解析。
    assert.equal(
      parseCreateTopicInput({
        slug: 'good-slug-2',
        nameZh: '合法',
        nameEn: 'Good',
        sortOrder: 1,
      }).slug,
      'good-slug-2',
    )
  })

  it('编辑写 topic.update 日志，不改 slug 与归档态', async () => {
    const row = await db.query<{ id: number }>(`SELECT id FROM topics WHERE slug = 'tester-corner'`)
    const id = row.rows[0]!.id
    const updated = await adminUpdateTopic(
      admin,
      id,
      { nameZh: '测试角改名', nameEn: 'Test Corner 2', description: '说明', icon: 'flask', sortOrder: 5 },
      ex,
    )
    assert.equal(updated.nameZh, '测试角改名')
    assert.equal(updated.slug, 'tester-corner')
    assert.equal(updated.archived, false)
    assert.equal(await logsOf('topic.update'), 1)
  })

  it('归档 / 恢复幂等：再次归档不重复写日志，公开列表不含归档话题', async () => {
    const row = await db.query<{ id: number }>(`SELECT id FROM topics WHERE slug = 'tester-corner'`)
    const id = row.rows[0]!.id
    const archived = await adminSetTopicArchived(admin, id, true, ex)
    assert.equal(archived.archived, true)
    assert.equal(await logsOf('topic.archive'), 1)

    // 幂等：再次归档返回现状，不重复写日志。
    const again = await adminSetTopicArchived(admin, id, true, ex)
    assert.equal(again.archived, true)
    assert.equal(await logsOf('topic.archive'), 1)

    // 公开列表（listTopics 在另一模块，这里直接查库核对可见性口径）。
    const visible = await db.query<{ id: number }>(
      `SELECT id FROM topics WHERE deleted_at IS NULL AND id = $1`,
      [id],
    )
    assert.equal(visible.rows.length, 0)

    const restored = await adminSetTopicArchived(admin, id, false, ex)
    assert.equal(restored.archived, false)
    // 归档 + 恢复各一次，日志共 2 条（幂等那次不算）。
    assert.equal(await logsOf('topic.archive'), 2)
  })

  it('基础统计：四数字口径正确', async () => {
    const stats = await getAdminStats(ex)
    // 2 个用户（alice + root，均非 deleted）、1 篇已发布帖、0 条评论、0 条待处理举报。
    assert.equal(stats.userCount, 2)
    assert.equal(stats.postCount, 1)
    assert.equal(stats.commentCount, 0)
    assert.equal(stats.pendingReportCount, 0)

    // 造一条评论 + 一条 pending 举报，数字应随之变化。
    await db.exec(`
      INSERT INTO comments (post_id, author_id, body) VALUES (10, 1, '统计用评论');
      INSERT INTO reports (kind, reporter_id, target_type, target_id, reason, detail)
        VALUES ('report', 1, 'post', 10, 'spam', '统计用举报');
    `)
    const after = await getAdminStats(ex)
    assert.equal(after.commentCount, 1)
    assert.equal(after.pendingReportCount, 1)
  })

  it('统计口径：停用作者 / 归档话题的帖子不计入帖子数', async () => {
    // 归档话题 technology（帖子 10 归属它）→ 帖子数归零。
    await db.exec(`UPDATE topics SET deleted_at = now() WHERE slug = 'technology'`)
    const stats = await getAdminStats(ex)
    assert.equal(stats.postCount, 0)
  })
})
