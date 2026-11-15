// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import { type RowExecutor } from '../posts/index.js'
import type { AnnouncementInput } from './announcement.types.js'

/**
 * 公告的读写。表结构见 `migrations/016_announcements.sql`。
 *
 * 只读写 `announcements` 表；「发布记录」（代码常量）不经过这里——
 * 它随版本走，没有写入口。
 */

/** 行类型收敛：`RowExecutor` 的行类型固定为帖子投影，本模块查的是别的表。 */
async function rowsOf<T>(
  executor: RowExecutor,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await executor.query(sql, params)
  return result.rows as unknown as T[]
}

export type AnnouncementRow = {
  id: number
  kind: string
  title: string
  summary: string
  body: string
  is_pinned: boolean
  status: string
  published_at: Date | null
  created_at: Date
  updated_at: Date
}

const COLUMNS = `id::int AS id, kind, title, summary, body, is_pinned,
                 status, published_at, created_at, updated_at`

/** 公开列表：已发布且未删除，置顶优先，再按发布时间倒序。 */
export async function listPublished(
  executor: RowExecutor = pool,
): Promise<AnnouncementRow[]> {
  return rowsOf<AnnouncementRow>(
    executor,
    `SELECT ${COLUMNS}
       FROM announcements
      WHERE status = 'published' AND deleted_at IS NULL
      ORDER BY is_pinned DESC, published_at DESC, id DESC`,
  )
}

/** 管理列表：含草稿，按最后修改倒序（刚改过的排前面，便于连续编辑）。 */
export async function listAllForAdmin(
  executor: RowExecutor = pool,
): Promise<AnnouncementRow[]> {
  return rowsOf<AnnouncementRow>(
    executor,
    `SELECT ${COLUMNS}
       FROM announcements
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC, id DESC`,
  )
}

/** 按 id 取未删除的一条；不存在或已软删除返回 null。 */
export async function findById(
  id: number,
  executor: RowExecutor = pool,
): Promise<AnnouncementRow | null> {
  const rows = await rowsOf<AnnouncementRow>(
    executor,
    `SELECT ${COLUMNS} FROM announcements WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )
  return rows[0] ?? null
}

/**
 * 新建。`published_at` 由调用方按状态决定传值或 null——
 * 数据库有 `(status='published') = (published_at IS NOT NULL)` 的检查约束兜底，
 * 传错会直接被拒，不会写入一条「发布了但没有时间」的怪数据。
 */
export async function insertAnnouncement(
  input: AnnouncementInput,
  publishedAt: Date | null,
  userId: string,
  executor: RowExecutor = pool,
): Promise<AnnouncementRow> {
  const rows = await rowsOf<AnnouncementRow>(
    executor,
    `INSERT INTO announcements (kind, title, summary, body, is_pinned, status, published_at, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING ${COLUMNS}`,
    [input.kind, input.title, input.summary, input.body, input.isPinned, input.status, publishedAt, userId],
  )
  return rows[0]!
}

/**
 * 整条覆盖更新。
 *
 * 之所以不用「只更新出现的字段」：公告编辑是单人低频操作，且 `published_at`
 * 与 `status` 必须成对变化（发布时补时间、撤回时清空），拆成动态 SET 会让这段
 * 逻辑散在 SQL 里更难读。合并后的完整值由服务层给出，这里只负责写。
 */
export async function updateAnnouncement(
  id: number,
  input: AnnouncementInput,
  publishedAt: Date | null,
  userId: string,
  executor: RowExecutor = pool,
): Promise<AnnouncementRow | null> {
  const rows = await rowsOf<AnnouncementRow>(
    executor,
    `UPDATE announcements
        SET kind = $2, title = $3, summary = $4, body = $5, is_pinned = $6,
            status = $7, published_at = $8, updated_by = $9, updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING ${COLUMNS}`,
    [id, input.kind, input.title, input.summary, input.body, input.isPinned, input.status, publishedAt, userId],
  )
  return rows[0] ?? null
}

/**
 * 软删除。不做物理删除：公告正文是人工撰写的内容，代码里没有副本，
 * 误删无法从仓库恢复；保留行至少能从数据库里捞回来。
 */
export async function softDeleteAnnouncement(
  id: number,
  executor: RowExecutor = pool,
): Promise<boolean> {
  const rows = await rowsOf<{ id: number }>(
    executor,
    `UPDATE announcements SET deleted_at = now(), updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id::int AS id`,
    [id],
  )
  return rows.length > 0
}
