// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CursorPayload } from '../../shared/pagination.js'
import type {
  AdminContentItem,
  AdminUserItem,
  ContentStatusTarget,
  Executor,
  UserStatusTarget,
} from './admin.types.js'

/**
 * 管理端治理仓储：用户与内容的列表、状态变更。
 *
 * 与公开仓储刻意分开：管理端要看到已移除内容、要停用账号、要在同一事务里写日志，
 * 语义与「作者删自己内容」「公开可见性投影」不同，混在一处会互相污染。
 * 全部参数化查询；接受 Executor 注入，生产由服务层包 withTransaction，测试传 PGlite。
 */

/**
 * 用户投影列：角色存于 users.role_id 外键，须 JOIN roles 取 r.name AS role
 * （与 auth.repository 同口径；users 表本身没有 role 列）。
 */
const USER_SELECT = `u.id, u.username, u.display_name, r.name AS role, u.status, u.created_at
      FROM users u JOIN roles r ON r.id = u.role_id`

export async function listUsers(
  cursor: CursorPayload | null,
  limit: number,
  executor: Executor,
): Promise<{ rows: AdminUserItem[]; hasMore: boolean }> {
  const result = await executor.query(
    `SELECT ${USER_SELECT}
      WHERE ($1::timestamptz IS NULL OR (u.created_at, u.id) < ($1::timestamptz, $2::bigint))
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $3`,
    [cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )
  const all = result.rows as Array<Record<string, unknown> & { created_at: Date | string }>
  const rows = all.slice(0, limit).map(
    (r): AdminUserItem => ({
      id: Number(r.id),
      username: String(r.username),
      displayName: String(r.display_name),
      role: String(r.role),
      status: String(r.status),
      createdAt: new Date(r.created_at).toISOString(),
    }),
  )
  return { rows, hasMore: all.length > limit }
}

/**
 * 变更用户状态：仅 suspended ↔ active，禁止把账号翻到 deleted（那是用户注销语义）。
 * 条件含 status <> 目标态，保证幂等——重复操作不重复写日志。
 * 返回变更后的行；未命中（不存在，或已是目标态）返回 null，由服务层区分。
 */
export async function setUserStatus(
  id: number,
  status: UserStatusTarget,
  executor: Executor,
): Promise<AdminUserItem | null> {
  const result = await executor.query(
    `UPDATE users u SET status = $2, updated_at = now()
      WHERE u.id = $1 AND u.status <> $2 AND u.status IN ('active', 'suspended')
      RETURNING u.id, u.username, u.display_name,
                (SELECT r.name FROM roles r WHERE r.id = u.role_id) AS role,
                u.status, u.created_at`,
    [id, status],
  )
  const r = result.rows[0] as (Record<string, unknown> & { created_at: Date | string }) | undefined
  if (!r) return null
  return {
    id: Number(r.id),
    username: String(r.username),
    displayName: String(r.display_name),
    role: String(r.role),
    status: String(r.status),
    createdAt: new Date(r.created_at).toISOString(),
  }
}

/** 内容列表共用取数：kind 决定查 posts 还是 comments，均含已移除项，键集翻页。 */
export async function listContent(
  kind: 'post' | 'comment',
  cursor: CursorPayload | null,
  limit: number,
  executor: Executor,
): Promise<{ rows: AdminContentItem[]; hasMore: boolean }> {
  const sql =
    kind === 'post'
      ? `SELECT p.id, u.username AS author_name, p.title AS body, p.status,
                p.created_at, NULL::bigint AS post_id
           FROM posts p JOIN users u ON u.id = p.author_id
          WHERE ($1::timestamptz IS NULL OR (p.created_at, p.id) < ($1::timestamptz, $2::bigint))
          ORDER BY p.created_at DESC, p.id DESC LIMIT $3`
      : `SELECT c.id, u.username AS author_name, c.body, c.status,
                c.created_at, c.post_id
           FROM comments c JOIN users u ON u.id = c.author_id
          WHERE ($1::timestamptz IS NULL OR (c.created_at, c.id) < ($1::timestamptz, $2::bigint))
          ORDER BY c.created_at DESC, c.id DESC LIMIT $3`
  const result = await executor.query(sql, [cursor?.t ?? null, cursor?.id ?? null, limit + 1])
  const all = result.rows as Array<Record<string, unknown> & { created_at: Date | string }>
  const rows = all.slice(0, limit).map(
    (r): AdminContentItem => ({
      id: Number(r.id),
      authorName: String(r.author_name),
      body: String(r.body ?? ''),
      status: String(r.status),
      createdAt: new Date(r.created_at).toISOString(),
      postId: r.post_id === null || r.post_id === undefined ? null : Number(r.post_id),
    }),
  )
  return { rows, hasMore: all.length > limit }
}

/**
 * 变更内容状态。帖子与评论同口径：
 * - 移除 → status='removed'，恢复 → status='published'。
 * - deleted_at 始终不动（保持 NULL）：数据库 CHECK `(deleted_at IS NULL) = (status <> 'deleted')`
 *   规定只有 deleted 状态才允许删除时间。管理员移除不是用户软删除，用 removed 态即可恢复。
 * - 只允许在 published ↔ removed 之间翻转，draft / deleted 不可由管理端改动。
 * - 评论计数随移除/恢复同步增减，与 runRemoveComment 同口径。
 */
export async function setContentStatus(
  kind: 'post' | 'comment',
  id: number,
  target: ContentStatusTarget,
  executor: Executor,
): Promise<AdminContentItem | null> {
  const removing = target === 'removed'
  const sql =
    kind === 'post'
      ? `UPDATE posts SET status = $2, updated_at = now()
          WHERE id = $1 AND status <> $2 AND status IN ('published', 'removed')
          RETURNING id, status, created_at, NULL::text AS author_name, title AS body, NULL::bigint AS post_id`
      : `UPDATE comments SET status = $2, updated_at = now()
          WHERE id = $1 AND status <> $2 AND status IN ('published', 'removed')
          RETURNING id, status, created_at, body, post_id, NULL::text AS author_name`

  const result = await executor.query(sql, [id, target])
  const r = result.rows[0] as (Record<string, unknown> & { created_at: Date | string }) | undefined
  if (!r) return null

  if (kind === 'comment') {
    // 计数联动：移除 -1、恢复 +1，均不为负。与 runRemoveComment 同口径。
    await executor.query(
      `UPDATE posts SET comment_count = GREATEST(comment_count + $2, 0)
        WHERE id = (SELECT post_id FROM comments WHERE id = $1)`,
      [id, removing ? -1 : 1],
    )
  }
  return {
    id: Number(r.id),
    authorName: String(r.author_name ?? ''),
    body: String(r.body ?? ''),
    status: String(r.status),
    createdAt: new Date(r.created_at).toISOString(),
    postId: r.post_id === null || r.post_id === undefined ? null : Number(r.post_id),
  }
}

/** 按 id 查用户当前行，供状态变更幂等判断：区分「已是目标态」与「真不存在」。 */
export async function findUserById(
  id: number,
  executor: Executor,
): Promise<AdminUserItem | null> {
  const result = await executor.query(
    `SELECT ${USER_SELECT} WHERE u.id = $1`,
    [id],
  )
  const r = result.rows[0] as (Record<string, unknown> & { created_at: Date | string }) | undefined
  if (!r) return null
  return {
    id: Number(r.id),
    username: String(r.username),
    displayName: String(r.display_name),
    role: String(r.role),
    status: String(r.status),
    createdAt: new Date(r.created_at).toISOString(),
  }
}

/** 按 id 查内容当前行，供状态变更幂等判断。 */
export async function findContentById(
  kind: 'post' | 'comment',
  id: number,
  executor: Executor,
): Promise<AdminContentItem | null> {
  const sql =
    kind === 'post'
      ? `SELECT p.id, u.username AS author_name, p.title AS body, p.status,
                p.created_at, NULL::bigint AS post_id
           FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = $1`
      : `SELECT c.id, u.username AS author_name, c.body, c.status,
                c.created_at, c.post_id
           FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = $1`
  const result = await executor.query(sql, [id])
  const r = result.rows[0] as (Record<string, unknown> & { created_at: Date | string }) | undefined
  if (!r) return null
  return {
    id: Number(r.id),
    authorName: String(r.author_name),
    body: String(r.body ?? ''),
    status: String(r.status),
    createdAt: new Date(r.created_at).toISOString(),
    postId: r.post_id === null || r.post_id === undefined ? null : Number(r.post_id),
  }
}
