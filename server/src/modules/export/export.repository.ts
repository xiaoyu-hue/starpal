// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import { type RowExecutor } from '../posts/index.js'

/**
 * 导出用的跨表只读查询（ARCHITECTURE.md §7.7「用户导出」标注为跨表只读）。
 *
 * 原则：`WHERE` 一律带 `author_id = $1`，不在应用层过滤——把边界写在 SQL 里，
 * 少一处「忘了过滤」的可能。不接受外部传入的用户标识，只接受已认证主体 id。
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

export type ProfileRow = {
  username: string
  display_name: string
  created_at: Date
  last_login_at: Date | null
  avatar_url: string | null
  biography: string | null
  zodiac: string | null
  mbti: string | null
  age_band: string | null
  show_optional: boolean
}

/**
 * 资料：users 与 user_profiles 左连接。
 *
 * 不查 `password_hash`、`role_id`、`status`——前两者属安全与权限内部字段，
 * 第三个（账号状态）对「带走自己的内容」没有意义，导出去只会造成困扰。
 * 可选资料可能整行为空，`show_optional` 用 coalesce 兜住。
 */
export async function findProfile(
  userId: string,
  executor: RowExecutor = pool,
): Promise<ProfileRow | null> {
  const rows = await rowsOf<ProfileRow>(
    executor,
    `SELECT u.username, u.display_name, u.created_at, u.last_login_at,
            pr.avatar_url, pr.biography, pr.zodiac, pr.mbti, pr.age_band,
            coalesce(pr.show_optional, false) AS show_optional
       FROM users u
       LEFT JOIN user_profiles pr ON pr.user_id = u.id
      WHERE u.id = $1`,
    [userId],
  )
  return rows[0] ?? null
}

export type PostRow = {
  id: number
  title: string
  body: string
  excerpt: string
  status: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  topic_slug: string
  topic_name: string
}

/**
 * 本人全部帖子，含草稿、被下架与被软删除的。
 *
 * 为什么不按「可见性」过滤：导出是**本人对自己写过的东西**的知情权，不是对外展示。
 * 若只导已发布，用户删过的草稿就永远找不回来了，而这恰恰是最需要导出的场景。
 * 状态由 `status` 字段如实标注，接收方自己判断。
 *
 * `id::int`：BIGSERIAL 经驱动读出来是字符串，导出文件里用数字更便于外部工具处理；
 * 社区体量远达不到 int4 上限，宁可简洁。
 */
export async function listOwnPosts(
  userId: string,
  executor: RowExecutor = pool,
): Promise<PostRow[]> {
  return rowsOf<PostRow>(
    executor,
    `SELECT p.id::int AS id, p.title, p.body, p.excerpt, p.status,
            p.created_at, p.updated_at, p.deleted_at,
            t.slug AS topic_slug, t.name_zh AS topic_name
       FROM posts p
       JOIN topics t ON t.id = p.topic_id
      WHERE p.author_id = $1
      ORDER BY p.created_at ASC, p.id ASC`,
    [userId],
  )
}

export type ImageRow = {
  post_id: number
  storage_key: string
  original_name: string
  mime_type: string
  width: number
  height: number
}

/** 本人帖子下的图片元数据（不含二进制）。按帖子与展示顺序排好，服务层直接分组。 */
export async function listOwnImages(
  userId: string,
  executor: RowExecutor = pool,
): Promise<ImageRow[]> {
  return rowsOf<ImageRow>(
    executor,
    `SELECT pi.post_id::int AS post_id, pi.storage_key, pi.original_name,
            pi.mime_type, pi.width, pi.height
       FROM post_images pi
       JOIN posts p ON p.id = pi.post_id
      WHERE p.author_id = $1
      ORDER BY pi.post_id ASC, pi.sort_order ASC`,
    [userId],
  )
}

export type CommentRow = {
  id: number
  post_id: number
  body: string
  status: string
  created_at: Date
  post_title: string
}

/**
 * 本人全部评论，同样含已删除的。
 *
 * 连表取帖子标题：评论离开上下文就失去意义，只给 `post_id` 等于把还原工作推给用户。
 * 帖子被作者本人删掉时标题仍在（软删除不删行），孤儿评论依然能读出「当时在说什么」。
 */
export async function listOwnComments(
  userId: string,
  executor: RowExecutor = pool,
): Promise<CommentRow[]> {
  return rowsOf<CommentRow>(
    executor,
    `SELECT c.id::int AS id, c.post_id::int AS post_id, c.body, c.status,
            c.created_at, p.title AS post_title
       FROM comments c
       JOIN posts p ON p.id = c.post_id
      WHERE c.author_id = $1
      ORDER BY c.created_at ASC, c.id ASC`,
    [userId],
  )
}
