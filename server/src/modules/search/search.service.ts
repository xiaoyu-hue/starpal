// SPDX-License-Identifier: AGPL-3.0-or-later
import { encodeCursor } from '../../shared/pagination.js'
import { attachViewerFlags } from '../interactions/index.js'
import { toListItem, type PostPage, type RowExecutor } from '../posts/index.js'
import { searchPostsInDb } from './search.repository.js'
import type { SearchQuery } from './search.schema.js'

/** 搜索视角：仅为补齐 isLiked / isBookmarked；权限本身不影响可见性（沿用 VISIBLE）。 */
export type SearchViewer = { id: string; role: string } | null

/**
 * 搜索服务：空关键词短路返回空页（前端走空态），否则查库并补全读者互动态。
 * 分页游标与信息流 latest 同构（created_at, id），因为排序同为「时间倒序」。
 * 可注入 executor，使同一段 SQL 能在 PGlite 内存库验证（与列表查询同一思路）。
 */
export async function search(
  query: SearchQuery,
  viewer: SearchViewer = null,
  executor?: RowExecutor,
): Promise<PostPage> {
  if (query.q.length === 0) {
    return { items: [], nextCursor: null, hasMore: false }
  }
  const { rows, hasMore } = await searchPostsInDb(query, executor)
  const last = rows.length > 0 ? rows[rows.length - 1] : null
  const items = await attachViewerFlags(rows.map(toListItem), viewer?.id ?? null, executor)
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({ t: last.createdAt, id: String(last.id) }) : null,
  }
}
