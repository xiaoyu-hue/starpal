// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import type { RowExecutor } from '../posts/index.js'
import { ANNOUNCEMENT_ITEMS } from '../../config/docs/announcements.doc.js'
import {
  findById,
  insertAnnouncement,
  listAllForAdmin,
  listPublished,
  softDeleteAnnouncement,
  updateAnnouncement,
  type AnnouncementRow,
} from './announcement.repository.js'
import type {
  AnnouncementAdminItem,
  AnnouncementFeed,
  AnnouncementInput,
  AnnouncementKind,
  AnnouncementPatch,
  AnnouncementStatus,
  AnnouncementView,
} from './announcement.types.js'

/**
 * 公告服务：把「库内公告」与「代码里的发布记录」拼成同一种视图。
 *
 * 两者的差别只在存储位置：档案随代码走、不可编辑；通知在库里、可编辑。
 * 拼接放在服务端而不是前端，是为了让右栏与公告页读到完全一致的一份数据，
 * 不会出现「右侧看到 A、点进公告页却没有 A」。
 */

const CST_OFFSET_MS = 8 * 3600_000

/** 东八区日期。库内时间存 UTC，展示与排序按东八区，与站内其他时间口径一致。 */
function toCstDate(date: Date): string {
  const shifted = new Date(date.getTime() + CST_OFFSET_MS)
  return shifted.toISOString().slice(0, 10)
}

/** 正文每行一条要点；空行与首尾空白丢弃，避免编辑时多敲的回车变成空条目。 */
function toPoints(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function toView(row: AnnouncementRow): AnnouncementView {
  return {
    id: `n-${row.id}`,
    kind: row.kind as AnnouncementKind,
    title: row.title,
    summary: row.summary,
    points: toPoints(row.body),
    action: null,
    date: row.published_at ? toCstDate(row.published_at) : toCstDate(row.created_at),
    pinned: row.is_pinned,
    source: 'notice',
  }
}

/**
 * 代码里的发布记录转成同一视图。
 *
 * 这里**不再包含「当前进度与已知问题」**——它已随迁移 016 搬进数据库，
 * 成为可由运营者随时改写的置顶条目。留在代码里会导致两份内容互相打架，
 * 那正是本次改造要解决的问题。
 */
function historyViews(): AnnouncementView[] {
  return ANNOUNCEMENT_ITEMS.map((item, index) => ({
    id: `h-${item.date}-${index}`,
    kind: item.kind,
    title: item.title,
    summary: item.summary,
    points: item.changes,
    action: item.action ?? null,
    date: item.date,
    pinned: false,
    source: 'history' as const,
  }))
}

/** 公开读：置顶、通知、历史档案三段分开返回，前端按段渲染，不必自己再分拣。 */
export async function getFeed(executor: RowExecutor = pool): Promise<AnnouncementFeed> {
  const rows = await listPublished(executor)
  const views = rows.map(toView)
  return {
    pinned: views.filter((view) => view.pinned),
    notices: views.filter((view) => !view.pinned),
    history: historyViews(),
  }
}

/** 管理列表：含草稿，附带状态与修改时间供表单回填。 */
export async function getAdminList(
  executor: RowExecutor = pool,
): Promise<AnnouncementAdminItem[]> {
  const rows = await listAllForAdmin(executor)
  return rows.map((row) => ({
    ...toView(row),
    numericId: row.id,
    status: row.status as AnnouncementStatus,
    updatedAt: row.updated_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  }))
}

/** 发布时间：首次发布取当前时刻，草稿为 null；已发布后再编辑不刷新时间（那是「首次发布」的事实）。 */
function resolvePublishedAt(
  status: AnnouncementStatus,
  previous: Date | null,
): Date | null {
  if (status === 'draft') return null
  return previous ?? new Date()
}

export async function createAnnouncement(
  userId: string,
  input: AnnouncementInput,
  executor: RowExecutor = pool,
): Promise<AnnouncementAdminItem> {
  const row = await insertAnnouncement(input, resolvePublishedAt(input.status, null), userId, executor)
  return {
    ...toView(row),
    numericId: row.id,
    status: row.status as AnnouncementStatus,
    updatedAt: row.updated_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  }
}

/**
 * 编辑：先读原行再合并。
 *
 * 部分字段更新时（例如只改置顶），其余字段必须保留原值；`published_at`
 * 也要按「原来是否有」决定，不能每次编辑都刷新成现在——否则一条 11-14 的
 * 公告改个错别字就会跳到 11-15，等于篡改了发布时间。
 */
export async function updateAnnouncementByPatch(
  id: number,
  userId: string,
  patch: AnnouncementPatch,
  executor: RowExecutor = pool,
): Promise<AnnouncementAdminItem> {
  const existing = await findById(id, executor)
  if (!existing) throw new DomainError('NOT_FOUND', '公告不存在')

  const merged: AnnouncementInput = {
    kind: (patch.kind ?? existing.kind) as AnnouncementKind,
    title: patch.title ?? existing.title,
    summary: patch.summary ?? existing.summary,
    body: patch.body ?? existing.body,
    isPinned: patch.isPinned ?? existing.is_pinned,
    status: (patch.status ?? existing.status) as AnnouncementStatus,
  }
  const publishedAt = resolvePublishedAt(merged.status, existing.published_at)

  const row = await updateAnnouncement(id, merged, publishedAt, userId, executor)
  if (!row) throw new DomainError('NOT_FOUND', '公告不存在')
  return {
    ...toView(row),
    numericId: row.id,
    status: row.status as AnnouncementStatus,
    updatedAt: row.updated_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  }
}

export async function removeAnnouncement(
  id: number,
  executor: RowExecutor = pool,
): Promise<void> {
  const ok = await softDeleteAnnouncement(id, executor)
  if (!ok) throw new DomainError('NOT_FOUND', '公告不存在')
}
