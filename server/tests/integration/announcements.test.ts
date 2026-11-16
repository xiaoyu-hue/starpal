// SPDX-License-Identifier: AGPL-3.0-or-later
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import type { RowExecutor } from '../../src/modules/posts/index.js'
import {
  createAnnouncement,
  getAdminList,
  getFeed,
  removeAnnouncement,
  updateAnnouncementByPatch,
} from '../../src/modules/announcements/index.js'

/**
 * 社区公告 M6-S0：PGlite 内存真库跑与线上同一段 SQL。
 *
 * 公告改造要解决的核心问题是「改状态 = 改历史」。因此测试重点不在 CRUD 能不能跑，
 * 而在四条边界：
 * 1. 草稿绝不会漏到公开接口；
 * 2. 发布时间要么有值要么为空，不能出现「发布了但没有时间」；
 * 3. 改标题不会刷新发布时间（否则改错别字等于篡改日期）；
 * 4. 「当前进度」已搬进数据库，代码档案里不能再留一份同名的。
 */

describe('社区公告 M6-S0', () => {
  let db: PGlite
  let ex: RowExecutor
  let adminId: string

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) as never }
    await seedUser(db, 90, 'operator')
    adminId = '90'
  })

  const base = {
    kind: 'notice' as const,
    title: '今晚维护',
    summary: '22:00 起停服约 10 分钟。',
    body: '期间无法发帖与评论。\n请提前保存正在写的内容。',
    isPinned: false,
    status: 'draft' as const,
  }

  it('迁移种子带来一条置顶的「当前进度」，且代码档案里不再重复', async () => {
    const feed = await getFeed(ex)
    assert.equal(feed.pinned.length, 1)
    assert.equal(feed.pinned[0]!.title, '当前进度与已知问题')
    assert.ok(
      feed.history.every((item) => item.title !== '当前进度与已知问题'),
      '同一内容不能既在库里又在代码里',
    )
    assert.ok(feed.history.length > 0, '发布记录应保留在代码里')
  })

  it('等级与治理后台上线后，状态公告正文不再把它们列为「尚未开始」', async () => {
    const feed = await getFeed(ex)
    const body = feed.pinned[0]!.points.join('\n')
    // 020 / 023 用子串 replace 改写正文：这条断言跑在真库上，验证拼接后的迁移确实生效，
    // 而不是只改了迁移文件、线上仍是旧文案。
    assert.ok(body.includes('等级与段位已上线'), '正文应写明等级已交付')
    assert.ok(body.includes('治理后台已上线'), '正文应写明治理后台已交付')
    assert.ok(
      !body.includes('尚未开始：经验 / 签到 / 等级'),
      '等级与签到已不再是「尚未开始」项',
    )
    assert.ok(!body.includes('完整治理后台与审核日志'), '治理后台已交付，不得再列为缺口')
    assert.ok(body.includes('尚未开始：验收与性能加固'), '真正未完成的能力仍要如实列出')
    // 017 追加的通知范围说明不能被 020 / 023 的替换误伤
    assert.ok(body.includes('通知只在你收到评论时发出'), '通知范围说明应保留')
  })

  it('草稿不会出现在公开接口，但管理列表能看到', async () => {
    const draft = await createAnnouncement(adminId, base, ex)
    assert.equal(draft.status, 'draft')

    const feed = await getFeed(ex)
    assert.ok(feed.notices.every((item) => item.title !== '今晚维护'))

    const adminList = await getAdminList(ex)
    assert.ok(adminList.some((item) => item.id === draft.id && item.status === 'draft'))
  })

  it('发布时补发布时间，撤回草稿时清空；正文按行拆成要点', async () => {
    const draft = await createAnnouncement(adminId, { ...base, title: '发布测试' }, ex)
    const published = await updateAnnouncementByPatch(Number(draft.id.replace('n-', '')), adminId, {
      status: 'published',
    }, ex)
    assert.equal(published.status, 'published')
    assert.ok(published.date.match(/^\d{4}-\d{2}-\d{2}$/))
    assert.deepEqual(published.points, ['期间无法发帖与评论。', '请提前保存正在写的内容。'])

    const feed = await getFeed(ex)
    assert.ok(feed.notices.some((item) => item.title === '发布测试'))

    const id = Number(published.id.replace('n-', ''))
    const back = await updateAnnouncementByPatch(id, adminId, { status: 'draft' }, ex)
    assert.equal(back.status, 'draft')
    const afterFeed = await getFeed(ex)
    assert.ok(afterFeed.notices.every((item) => item.title !== '发布测试'), '撤回后不应再公开')
  })

  it('改标题不刷新发布时间', async () => {
    const created = await createAnnouncement(adminId, {
      ...base,
      title: '原文标题',
      status: 'published',
    }, ex)
    const id = Number(created.id.replace('n-', ''))
    const before = await db.query<{ published_at: Date }>(
      'SELECT published_at FROM announcements WHERE id = $1',
      [id],
    )
    const edited = await updateAnnouncementByPatch(id, adminId, { title: '改过的标题' }, ex)
    const after = await db.query<{ published_at: Date }>(
      'SELECT published_at FROM announcements WHERE id = $1',
      [id],
    )
    assert.equal(edited.title, '改过的标题')
    assert.equal(
      after.rows[0]!.published_at.getTime(),
      before.rows[0]!.published_at.getTime(),
      '发布时间代表首次发布的事实，编辑不应改写',
    )
  })

  it('置顶排在最前，取消置顶后回到按时间排序', async () => {
    const created = await createAnnouncement(adminId, {
      ...base,
      title: '置顶测试',
      status: 'published',
      isPinned: true,
    }, ex)
    const feed = await getFeed(ex)
    assert.ok(feed.pinned.some((item) => item.title === '置顶测试'))
    assert.ok(feed.pinned.some((item) => item.title === '当前进度与已知问题'))

    const id = Number(created.id.replace('n-', ''))
    await updateAnnouncementByPatch(id, adminId, { isPinned: false }, ex)
    const after = await getFeed(ex)
    assert.ok(after.pinned.every((item) => item.title !== '置顶测试'))
  })

  it('软删除后公开与管理列表都不再出现，且行仍在库里', async () => {
    const created = await createAnnouncement(adminId, {
      ...base,
      title: '待删除',
      status: 'published',
    }, ex)
    const id = Number(created.id.replace('n-', ''))
    await removeAnnouncement(id, ex)

    const feed = await getFeed(ex)
    assert.ok(feed.notices.every((item) => item.title !== '待删除'))
    const adminList = await getAdminList(ex)
    assert.ok(adminList.every((item) => item.title !== '待删除'))

    const row = await db.query<{ deleted_at: Date | null }>(
      'SELECT deleted_at FROM announcements WHERE id = $1',
      [id],
    )
    assert.ok(row.rows[0]!.deleted_at, '软删除应保留行，便于误删后打捞')
  })

  it('删除不存在的公告报 NOT_FOUND', async () => {
    await assert.rejects(
      () => removeAnnouncement(99999, ex),
      (error: unknown) => (error as { code?: string }).code === 'NOT_FOUND',
    )
  })
})
