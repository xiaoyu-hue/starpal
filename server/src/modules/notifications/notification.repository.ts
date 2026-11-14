/**
 * 最小执行器接口：与 comment.repository 保持一致的签名，
 * 使同一段 SQL 能在测试的内存库上直测，不必为测试另写「近似」实现。
 */
export type Executor = {
  query(
    sql: string,
    params: unknown[],
  ): Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>
}

/**
 * 通知持久化层。
 *
 * `notifications` 表由 005 迁移建立，评论产生的通知已在评论事务内写入
 * （见 comment.repository.ts 的不变式②）。本层只负责「读取与标记」，
 * 不负责产生通知——产生方仍在各自的写事务里，保持单一写入源。
 *
 * 列表按 `(created_at, id)` 键集倒序游标，复用 005 已建的部分索引；
 * 当前只有 `comment` 一种类型，因此 target 直接 join comments → posts 取帖子标题与跳转 id，
 * 类型白名单由表约束兜底，新增类型时只需在此补充对应 join 与渲染字段。
 */

export type NotificationRow = {
  id: number
  type: string
  isRead: boolean
  createdAt: string
  actorId: string | null
  actorUsername: string | null
  actorDisplayName: string | null
  actorStatus: string | null
  actorAvatarUrl: string | null
  /** `comment` 类型专用：被评论的帖子与评论主键，供前端跳转。 */
  commentId: number | null
  postId: number | null
  postTitle: string | null
}

export type Cursor = { t: string; id: string } | null

const LIST_SELECT = `
  SELECT
    n.id, n.type, n.is_read, n.created_at,
    n.actor_id,
    au.username                              AS actor_username,
    au.display_name                          AS actor_display_name,
    au.status                                AS actor_status,
    aup.avatar_url                           AS actor_avatar_url,
    c.id                                     AS comment_id,
    c.post_id                                AS post_id,
    p.title                                  AS post_title
  FROM notifications n
  LEFT JOIN users au          ON au.id = n.actor_id
  LEFT JOIN user_profiles aup ON aup.user_id = au.id
  LEFT JOIN comments c        ON c.id = n.target_id AND n.target_type = 'comment'
  LEFT JOIN posts p           ON p.id = c.post_id
`

function mapRow(row: Record<string, unknown>): NotificationRow {
  return {
    id: Number(row.id),
    type: String(row.type),
    isRead: row.is_read === true,
    createdAt: (row.created_at as Date).toISOString(),
    actorId: row.actor_id === null ? null : String(row.actor_id),
    actorUsername: (row.actor_username as string | null) ?? null,
    actorDisplayName: (row.actor_display_name as string | null) ?? null,
    actorStatus: (row.actor_status as string | null) ?? null,
    actorAvatarUrl: (row.actor_avatar_url as string | null) ?? null,
    commentId: row.comment_id === null ? null : Number(row.comment_id),
    postId: row.post_id === null ? null : Number(row.post_id),
    postTitle: (row.post_title as string | null) ?? null,
  }
}

export async function listNotifications(
  executor: Executor,
  userId: string,
  cursor: Cursor,
  limit: number,
): Promise<{ rows: NotificationRow[]; hasMore: boolean }> {
  const result = await executor.query(
    `${LIST_SELECT}
     WHERE n.user_id = $1
       AND ($2::timestamptz IS NULL OR (n.created_at, n.id) < ($2::timestamptz, $3::bigint))
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT $4`,
    [userId, cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )
  const rows = (result.rows as Record<string, unknown>[]).map(mapRow)
  const hasMore = rows.length > limit
  return { rows: rows.slice(0, limit), hasMore }
}

export async function countUnread(executor: Executor, userId: string): Promise<number> {
  const result = await executor.query(
    'SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId],
  )
  return Number((result.rows[0] as { n: number }).n)
}

export async function markAllRead(executor: Executor, userId: string): Promise<number> {
  const result = await executor.query(
    'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
    [userId],
  )
  return result.rowCount ?? 0
}
