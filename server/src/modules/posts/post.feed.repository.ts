// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  FEED_FRESHNESS_DECAY_DAYS,
  FEED_HOT_LOG_SCALE,
  FEED_POPULAR_WINDOW_DAYS,
  FEED_POPULAR_WEIGHTS,
  FEED_RECOMMENDED_WINDOW_DAYS,
  FEED_WEIGHTS,
  POST_RELATED_LIMIT,
} from '../../config/constants.js'
import { pool } from '../../db/pool.js'
import type { FeedQuery } from './post.schema.js'
import {
  FROM_JOINS,
  PROJECTION,
  VISIBLE,
  queryRows,
  type PostRecord,
  type RowExecutor,
} from './post.projection.js'

/**
 * 帖子列表查询：三 Tab 排序、游标键集分页、话题筛选、相关帖子与作者列表。
 * 排序权重取自 config/constants 的 FEED_* 常量（PRD §4.2 要求集中定义）；
 * 插值内容为代码内常量，非用户输入，不存在注入面。
 */

const DECAY_SECONDS = 86_400 * FEED_FRESHNESS_DECAY_DAYS

/**
 * 时间衰减因子：以整点小时为基准。
 * 用整点而非 now() 是为让同一翻页链内的分数保持稳定，避免游标跳项。
 */
const FRESHNESS = `exp(
  - (EXTRACT(EPOCH FROM (date_trunc('hour', now()) - p.created_at))::double precision)
  / ${DECAY_SECONDS}.0
)`

/** 热度分：log10(max(净赞,1)) / 缩放，归一到 0..1，抑制高赞内容的线性碾压。 */
const HOT = `LEAST(
  1.0,
  log(10.0, GREATEST(p.like_count, 1)::numeric)::double precision / ${FEED_HOT_LOG_SCALE}.0
)`

/**
 * 推荐综合分：话题亲和度 + 新鲜度 + 热度。
 * 话题亲和度只来自调用方显式选择的话题（`topic` 参数），不含任何行为画像；
 * 未指定话题时该项恒为 0，此时排序由新鲜度与热度决定。
 */
const RECOMMENDED_SCORE = `
  ${FEED_WEIGHTS.topic} * (CASE WHEN $1::text IS NOT NULL AND t.slug = $1 THEN 1.0 ELSE 0.0 END)
  + ${FEED_WEIGHTS.freshness} * ${FRESHNESS}
  + ${FEED_WEIGHTS.hot} * ${HOT}
`

/** 热门综合分：以净赞为主、时间衰减为辅（PRD §4.2「辅以时间衰减」）。 */
const POPULAR_SCORE = `
  ${FEED_POPULAR_WEIGHTS.hot} * ${HOT}
  + ${FEED_POPULAR_WEIGHTS.freshness} * ${FRESHNESS}
`

type ListParams = {
  topicSlug: string | null
  cursorT: string | null
  cursorId: string | null
  limit: number
}

type ListResult = { rows: PostRecord[]; hasMore: boolean }

/** 最新：按创建时间倒序，游标为 (created_at, id) 键集。 */
async function listLatest(params: ListParams): Promise<ListResult> {
  const rows = await queryRows(
    pool,
    `SELECT ${PROJECTION} ${FROM_JOINS}
      WHERE ${VISIBLE}
        AND ($1::text IS NULL OR t.slug = $1)
        AND ($2::timestamptz IS NULL OR (p.created_at, p.id) < ($2::timestamptz, $3::bigint))
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $4`,
    [params.topicSlug, params.cursorT, params.cursorId, params.limit + 1],
  )
  const hasMore = rows.length > params.limit
  return { rows: rows.slice(0, params.limit), hasMore }
}

/** 加权排序（热门 / 推荐）：游标为 (rank_score, id) 键集，窗口外内容不参与。 */
async function listScored(
  params: ListParams,
  scoreExpr: string,
  windowDays: number,
): Promise<ListResult> {
  const rows = await queryRows(
    pool,
    `WITH scored AS (
       SELECT ${PROJECTION}, (${scoreExpr}) AS rank_score
       ${FROM_JOINS}
        WHERE ${VISIBLE}
          AND p.created_at >= date_trunc('hour', now()) - interval '${windowDays} days'
     )
     SELECT * FROM scored
      WHERE ($1::text IS NULL OR topic_slug = $1)
        AND ($2::double precision IS NULL OR (rank_score, id) < ($2::double precision, $3::bigint))
      ORDER BY rank_score DESC, id DESC
      LIMIT $4`,
    [params.topicSlug, params.cursorT, params.cursorId, params.limit + 1],
  )
  const hasMore = rows.length > params.limit
  return { rows: rows.slice(0, params.limit), hasMore }
}

/** 三 Tab 列表：游标语义随 Tab 变化（latest 为时间戳，其余为综合分）。 */
export async function listFeedPosts(query: FeedQuery): Promise<ListResult> {
  const params: ListParams = {
    topicSlug: query.topicSlug,
    cursorT: query.cursor?.t ?? null,
    cursorId: query.cursor?.id ?? null,
    limit: query.limit,
  }
  if (query.tab === 'popular') {
    return listScored(params, POPULAR_SCORE, FEED_POPULAR_WINDOW_DAYS)
  }
  if (query.tab === 'recommended') {
    return listScored(params, RECOMMENDED_SCORE, FEED_RECOMMENDED_WINDOW_DAYS)
  }
  return listLatest(params)
}

/** 相关帖子：同话题、排除自身、按时间倒序限量。 */
export async function listRelatedPosts(postId: number, topicId: number): Promise<PostRecord[]> {
  return queryRows(
    pool,
    `SELECT ${PROJECTION} ${FROM_JOINS}
      WHERE ${VISIBLE} AND p.topic_id = $1 AND p.id <> $2
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $3`,
    [topicId, postId, POST_RELATED_LIMIT],
  )
}

/** 作者公开帖子列表：个人页「已发布帖子」，与信息流同一可见性口径。 */
export async function listAuthorPosts(
  authorId: string,
  cursor: { t: string; id: string } | null,
  limit: number,
): Promise<ListResult> {
  const rows = await queryRows(
    pool,
    `SELECT ${PROJECTION} ${FROM_JOINS}
      WHERE ${VISIBLE} AND p.author_id = $1
        AND ($2::timestamptz IS NULL OR (p.created_at, p.id) < ($2::timestamptz, $3::bigint))
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $4`,
    [authorId, cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )
  const hasMore = rows.length > limit
  return { rows: rows.slice(0, limit), hasMore }
}

/** 作者已发布帖子计数：与列表同一过滤条件，避免「显示 3 条却写 5 篇」。 */
export async function countAuthorPosts(
  authorId: string,
  executor: { query(sql: string, params: unknown[]): Promise<{ rows: Record<string, unknown>[] }> } = pool,
): Promise<number> {
  const result = await executor.query(
    `SELECT count(*)::int AS n
       FROM posts p
       JOIN topics t ON t.id = p.topic_id
       JOIN users u ON u.id = p.author_id
      WHERE ${VISIBLE} AND p.author_id = $1`,
    [authorId],
  )
  return (result.rows[0] as { n: number } | undefined)?.n ?? 0
}

/**
 * 当前用户收藏列表：按「收藏时间」倒序（不是帖子创建时间）。
 *
 * JOIN bookmarks 后每个 (user, post) 至多一行（主键约束），不会放大结果集；
 * 可见性沿用 VISIBLE：帖子被删除/移除、话题归档或作者停用后，不再出现在收藏里。
 * 游标以 (b.created_at, p.id) 为键集，与 ORDER BY 严格对应，避免翻页跳项。
 * 可注入 executor，使同一段 SQL 能在 PGlite 内存库里验证，而非测试另写一份。
 */
export async function listBookmarkedPosts(
  userId: string,
  cursor: { t: string; id: string } | null,
  limit: number,
  executor: RowExecutor = pool,
): Promise<ListResult> {
  const rows = await queryRows(
    executor,
    `SELECT ${PROJECTION}, b.created_at AS bookmarked_at ${FROM_JOINS}
      JOIN bookmarks b ON b.post_id = p.id AND b.user_id = $1
      WHERE ${VISIBLE}
        AND ($2::timestamptz IS NULL OR (b.created_at, p.id) < ($2::timestamptz, $3::bigint))
      ORDER BY b.created_at DESC, p.id DESC
      LIMIT $4`,
    [userId, cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )
  const hasMore = rows.length > limit
  return { rows: rows.slice(0, limit), hasMore }
}

/**
 * 当前用户点赞列表：按「点赞时间」倒序（不是帖子创建时间）。
 *
 * 与收藏列表同构：JOIN likes 后每个 (user, post) 至多一行（主键约束），不会放大结果集；
 * 可见性沿用 VISIBLE，游标以 (l.created_at, p.id) 为键集，与 ORDER BY 严格对应。
 * likes_user_idx (user_id, created_at DESC) 服务于本读取方向（见 010 迁移）。
 * 可注入 executor，使同一段 SQL 能在 PGlite 内存库里验证。
 */
export async function listLikedPosts(
  userId: string,
  cursor: { t: string; id: string } | null,
  limit: number,
  executor: RowExecutor = pool,
): Promise<ListResult> {
  const rows = await queryRows(
    executor,
    `SELECT ${PROJECTION}, l.created_at AS liked_at ${FROM_JOINS}
      JOIN likes l ON l.post_id = p.id AND l.user_id = $1
      WHERE ${VISIBLE}
        AND ($2::timestamptz IS NULL OR (l.created_at, p.id) < ($2::timestamptz, $3::bigint))
      ORDER BY l.created_at DESC, p.id DESC
      LIMIT $4`,
    [userId, cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )
  const hasMore = rows.length > limit
  return { rows: rows.slice(0, limit), hasMore }
}
