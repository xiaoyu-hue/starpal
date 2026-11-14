import type { PoolClient } from 'pg'
import { pool, withTransaction } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'

/**
 * 评论持久化层。
 *
 * 三条不变式：
 * 1. 评论与 `posts.comment_count` 同事务增减，计数只统计 `published`；
 * 2. 通知与评论同事务写入——评论成功而通知丢失，接收者永远不会知道有人回复；
 * 3. 软删除语义由数据库约束兜底：`deleted` 必须带 `deleted_at`，`removed` 必须不带。
 *
 * 事务核心函数接受最小执行器接口（`Executor`），使同一段 SQL 能在测试的
 * PGlite 内存库上直测，不必为测试再写一份「近似」实现。
 */

export type Row = Record<string, unknown>

export type Executor = {
  query(sql: string, params: unknown[]): Promise<{ rows: Row[] }>
}

export type CommentRow = {
  id: string
  post_id: string
  body: string
  status: string
  created_at: Date
  author_id: string
  username: string
  display_name: string
  author_status: string
  avatar_url: string | null
}

const COMMENT_SELECT = `
  SELECT c.id, c.post_id, c.body, c.status, c.created_at, c.author_id,
         u.username, u.display_name, u.status AS author_status, up.avatar_url
    FROM comments c
    JOIN users u ON u.id = c.author_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
`

/** 评论作者与归属：删除前判权限用，不含正文，避免为鉴权读全文。 */
export type CommentRef = {
  id: number
  postId: number
  authorId: string
  status: string
}

async function readComment(executor: Executor, id: number): Promise<CommentRow> {
  const result = await executor.query(`${COMMENT_SELECT} WHERE c.id = $1`, [id])
  const row = result.rows[0] as CommentRow | undefined
  if (row === undefined) throw new Error(`刚写入的评论 ${id} 未能读回`)
  return row
}

export async function findCommentRef(id: number): Promise<CommentRef | null> {
  const result = await pool.query<{ id: string; post_id: string; author_id: string; status: string }>(
    'SELECT id, post_id, author_id, status FROM comments WHERE id = $1',
    [id],
  )
  const row = result.rows[0]
  if (row === undefined) return null
  return {
    id: Number(row.id),
    postId: Number(row.post_id),
    authorId: String(row.author_id),
    status: row.status,
  }
}

/**
 * 列表：时间倒序（最新在上），键集游标 `(created_at, id)`。
 *
 * `includeRemoved` 仅对管理员为真：被移除的评论对普通读者按不存在处理，
 * 与帖子可见性同一口径，避免借评论状态探测管理动作。
 */
export async function listComments(
  executor: Executor,
  postId: number,
  includeRemoved: boolean,
  cursor: { t: string; id: string } | null,
  limit: number,
): Promise<{ rows: CommentRow[]; hasMore: boolean }> {
  const result = await executor.query(
    `${COMMENT_SELECT}
      WHERE c.post_id = $1
        AND (c.status = 'published' OR ($2::boolean AND c.status = 'removed'))
        AND ($3::timestamptz IS NULL OR (c.created_at, c.id) < ($3::timestamptz, $4::bigint))
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT $5`,
    [postId, includeRemoved, cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )
  const rows = result.rows as CommentRow[]
  const hasMore = rows.length > limit
  return { rows: rows.slice(0, limit), hasMore }
}

/** `23503`：外键冲突。帖子在可见性检查与写入之间被物理删除时会发生。 */
const FK_VIOLATION = '23503'

function isFkViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === FK_VIOLATION
  )
}

/**
 * 发表：插入评论 + 计数 +1 + 通知帖子作者。
 *
 * 计数更新带 `status = 'published'` 条件：帖子在可见性检查与写入之间被删除 / 移除时
 * 不会产生「评论存在但帖子不可见」的孤儿记录，整笔事务回滚。
 * 通知以 `author_id <> 评论者` 过滤，自己评论自己的帖子不产生通知。
 *
 * 外键冲突说明帖子已不存在，转译为 `NOT_FOUND`：与点赞同一口径，不让竞态表现成 500。
 */
export async function runInsertComment(
  executor: Executor,
  postId: number,
  authorId: string,
  body: string,
): Promise<CommentRow> {
  try {
    const inserted = await executor.query(
      'INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3) RETURNING id',
      [postId, authorId, body],
    )
    const id = Number(inserted.rows[0]!.id)

    const bumped = await executor.query(
      `UPDATE posts SET comment_count = comment_count + 1
        WHERE id = $1 AND status = 'published' AND deleted_at IS NULL
        RETURNING comment_count`,
      [postId],
    )
    if (bumped.rows.length === 0) throw new DomainError('NOT_FOUND', '帖子不存在')

    await executor.query(
      `INSERT INTO notifications (user_id, type, actor_id, target_type, target_id)
       SELECT p.author_id, 'comment', $2, 'comment', $3
         FROM posts p
        WHERE p.id = $1 AND p.author_id <> $2`,
      [postId, authorId, id],
    )

    return readComment(executor, id)
  } catch (error) {
    if (isFkViolation(error)) throw new DomainError('NOT_FOUND', '帖子不存在')
    throw error
  }
}

/**
 * 移除：作者自删记 `deleted`（带 deleted_at），管理员移除他人记 `removed`（不带）。
 * 返回受影响帖子 id，未命中（已删除或不存在）返回 null。
 */
export async function runRemoveComment(
  executor: Executor,
  commentId: number,
  mode: 'deleted' | 'removed',
): Promise<number | null> {
  const sql =
    mode === 'deleted'
      ? `UPDATE comments SET status = 'deleted', deleted_at = now(), updated_at = now()
          WHERE id = $1 AND status = 'published' RETURNING post_id`
      : `UPDATE comments SET status = 'removed', deleted_at = NULL, updated_at = now()
          WHERE id = $1 AND status = 'published' RETURNING post_id`
  const updated = await executor.query(sql, [commentId])
  if (updated.rows.length === 0) return null

  const postId = Number(updated.rows[0]!.post_id)
  await executor.query(
    'UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1',
    [postId],
  )
  return postId
}

export async function insertComment(
  postId: number,
  authorId: string,
  body: string,
): Promise<CommentRow> {
  return withTransaction((client: PoolClient) => runInsertComment(client, postId, authorId, body))
}

export async function removeComment(
  commentId: number,
  mode: 'deleted' | 'removed',
): Promise<number | null> {
  return withTransaction((client: PoolClient) => runRemoveComment(client, commentId, mode))
}
