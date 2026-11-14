import { pool } from '../../db/pool.js'
import type { Executor } from './interaction.repository.js'

/**
 * 「当前读者是否点过赞 / 收藏」的批量补齐。
 *
 * 为什么不写进帖子投影的 SQL：这两项取决于 viewer，而投影是常量字符串，
 * 参数位置会随查询（信息流体、相关帖、个人页）变化，拼进去等于维护多份变体。
 * 改为一次批量查询后在内存合并：列表多一次往返，但避免 N+1，也避免 SQL 分叉。
 */

export type ViewerFlags = { isLiked: boolean; isBookmarked: boolean }

const NONE: ViewerFlags = { isLiked: false, isBookmarked: false }

const poolExecutor: Executor = { query: (sql, params) => pool.query(sql, params) }

async function idsWith(
  executor: Executor,
  table: 'likes' | 'bookmarks',
  viewerId: string,
  postIds: number[],
): Promise<Set<number>> {
  const result = await executor.query(
    `SELECT post_id FROM ${table} WHERE user_id = $1 AND post_id = ANY($2::bigint[])`,
    [viewerId, postIds],
  )
  return new Set(result.rows.map((row) => Number(row.post_id)))
}

/** 匿名读者不查库，直接补 false —— 省一次往返，也避免把 null 传进 SQL。 */
export async function attachViewerFlags<T extends { id: number }>(
  items: T[],
  viewerId: string | null,
  executor: Executor = poolExecutor,
): Promise<(T & ViewerFlags)[]> {
  if (viewerId === null || items.length === 0) {
    return items.map((item) => ({ ...item, ...NONE }))
  }
  const postIds = items.map((item) => item.id)
  const [liked, bookmarked] = await Promise.all([
    idsWith(executor, 'likes', viewerId, postIds),
    idsWith(executor, 'bookmarks', viewerId, postIds),
  ])
  return items.map((item) => ({
    ...item,
    isLiked: liked.has(item.id),
    isBookmarked: bookmarked.has(item.id),
  }))
}
