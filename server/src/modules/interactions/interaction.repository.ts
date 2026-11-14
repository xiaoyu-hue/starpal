import { DomainError } from '../../shared/errors.js'
import { withTransaction } from '../../db/pool.js'

/**
 * 点赞 / 收藏的持久化层。
 *
 * 计数与明细必须同事务：先以 `ON CONFLICT DO NOTHING` 判断是否真的新增，
 * 只有真正插入或删除才调整 `posts` 上的冗余计数。先查后插在并发下会算出两个 1，
 * 这是本模块最容易写错的地方，故把判断交给数据库的唯一约束。
 *
 * 存取器以最小接口注入（`Executor`），使同一段 SQL 既能跑在连接池上，
 * 也能在测试的 PGlite 内存库上执行——避免「测试另写一份 SQL」的假验证。
 */

/** `23503`：外键冲突。帖子在可见性检查与写入之间被删除时会发生。 */
const FK_VIOLATION = '23503'

export type Row = Record<string, unknown>

export type Executor = {
  query(sql: string, params: unknown[]): Promise<{ rows: Row[] }>
}

export type ToggleSpec = {
  table: 'likes' | 'bookmarks'
  column: 'like_count' | 'bookmark_count'
}

export type LikeState = { liked: boolean; likeCount: number }
export type BookmarkState = { bookmarked: boolean; bookmarkCount: number }

function isFkViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === FK_VIOLATION
  )
}

/** 幂等请求不写 `posts` 行，避免无变化时产生无谓的元组版本与 WAL。 */
async function readCounter(
  executor: Executor,
  column: ToggleSpec['column'],
  postId: number,
): Promise<number> {
  const result = await executor.query(`SELECT ${column} FROM posts WHERE id = $1`, [postId])
  const value = result.rows[0]?.[column]
  if (typeof value !== 'number') throw new DomainError('NOT_FOUND', '帖子不存在')
  return value
}

/**
 * 执行一次幂等切换并返回最新计数。
 * 导出以便集成测试直接验证 SQL 语义（重复请求、计数不为负、帖子不存在）。
 */
export async function runToggle(
  executor: Executor,
  postId: number,
  userId: string,
  on: boolean,
  spec: ToggleSpec,
): Promise<number> {
  try {
    const changed = on
      ? await executor.query(
          `INSERT INTO ${spec.table} (user_id, post_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING RETURNING 1`,
          [userId, postId],
        )
      : await executor.query(
          `DELETE FROM ${spec.table} WHERE user_id = $1 AND post_id = $2 RETURNING 1`,
          [userId, postId],
        )

    if (changed.rows.length === 0) return readCounter(executor, spec.column, postId)

    const delta = on ? 1 : -1
    const updated = await executor.query(
      `UPDATE posts SET ${spec.column} = GREATEST(${spec.column} + $2, 0)
       WHERE id = $1 RETURNING ${spec.column}`,
      [postId, delta],
    )
    const count = updated.rows[0]?.[spec.column]
    if (typeof count !== 'number') throw new DomainError('NOT_FOUND', '帖子不存在')
    return count
  } catch (error) {
    // 外键冲突只可能是帖子在可见性检查与写入之间被删除；对外统一为「不存在」。
    if (isFkViolation(error)) throw new DomainError('NOT_FOUND', '帖子不存在')
    throw error
  }
}

async function toggle(
  postId: number,
  userId: string,
  on: boolean,
  spec: ToggleSpec,
): Promise<number> {
  return withTransaction((client) => runToggle(client, postId, userId, on, spec))
}

export async function applyLike(postId: number, userId: string, on: boolean): Promise<LikeState> {
  const likeCount = await toggle(postId, userId, on, { table: 'likes', column: 'like_count' })
  return { liked: on, likeCount }
}

export async function applyBookmark(
  postId: number,
  userId: string,
  on: boolean,
): Promise<BookmarkState> {
  const bookmarkCount = await toggle(postId, userId, on, {
    table: 'bookmarks',
    column: 'bookmark_count',
  })
  return { bookmarked: on, bookmarkCount }
}
