// SPDX-License-Identifier: AGPL-3.0-or-later
import type { QueryResultRow } from 'pg'

/**
 * 帖子查询投影与行映射：列表、详情、相关帖子共用同一投影，
 * 保证「信息流卡片」与「详情页」字段口径一致，也避免图片单独查询造成 N+1。
 */

/** 作者、话题、图片键一次取齐；正文 `body` 由列表层按需裁剪，不做二次查询。 */
export const PROJECTION = `
  p.id,
  p.title,
  p.excerpt,
  p.body,
  p.status,
  p.like_count,
  p.comment_count,
  p.bookmark_count,
  p.created_at,
  p.updated_at,
  p.author_id,
  p.topic_id,
  t.slug     AS topic_slug,
  t.name_zh  AS topic_name,
  u.username,
  u.display_name,
  u.status   AS author_status,
  up.avatar_url,
  COALESCE((
    SELECT json_agg(
             json_build_object(
               'id', i.id,
               'key', i.storage_key,
               'width', i.width,
               'height', i.height
             ) ORDER BY i.sort_order
           )
      FROM post_images i WHERE i.post_id = p.id
  ), '[]'::json) AS images
`

export const FROM_JOINS = `
  FROM posts p
  JOIN topics t ON t.id = p.topic_id
  JOIN users u ON u.id = p.author_id
  LEFT JOIN user_profiles up ON up.user_id = u.id
`

/** 可见性条件：已发布、未删除、话题未归档、作者未被停用；已注销作者的内容保留署名占位。 */
export const VISIBLE = `
  p.status = 'published'
  AND p.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND u.status <> 'suspended'
`

export type PostRow = QueryResultRow & {
  id: string
  title: string
  excerpt: string
  body: string
  status: string
  like_count: number
  comment_count: number
  bookmark_count: number
  created_at: Date
  updated_at: Date
  author_id: string
  topic_id: number
  topic_slug: string
  topic_name: string
  username: string
  display_name: string
  author_status: string
  avatar_url: string | null
  /** 图片引用（键 + 尺寸 + 主键），聚合子查询一次取齐，避免列表逐条查图。 */
  images: { id: string; key: string; width: number; height: number }[]
  /** 仅 popular / recommended 的 CTE 查询会返回；latest 为 undefined。 */
  rank_score?: number
  /** 仅收藏列表查询会返回（JOIN bookmarks 的 created_at）；其余列表为 undefined。 */
  bookmarked_at?: Date
  /** 仅点赞列表查询会返回（JOIN likes 的 created_at）；其余列表为 undefined。 */
  liked_at?: Date
}

/** 作者已注销时统一替换为占位署名并隐去头像，与个人资料投影保持一致（ADR-010）。 */
export function mapRow(row: PostRow) {
  const deleted = row.author_status === 'deleted'
  return {
    id: Number(row.id),
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    status: row.status,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    bookmarkCount: row.bookmark_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    authorId: Number(row.author_id),
    topicId: Number(row.topic_id),
    author: {
      username: row.username,
      displayName: deleted ? '已注销用户' : row.display_name,
      avatarUrl: deleted ? null : row.avatar_url,
    },
    topic: { slug: row.topic_slug, nameZh: row.topic_name },
    images: row.images.map((image) => ({
      id: Number(image.id),
      key: image.key,
      width: image.width,
      height: image.height,
    })),
    rankScore: row.rank_score,
    // 收藏 / 点赞列表按「收藏 / 点赞时间」倒序分页，游标排序键取自关联表 created_at，
    // 而非帖子创建时间；这两个字段只在对应查询里存在，不进入对外列表投影。
    bookmarkedAt: row.bookmarked_at?.toISOString(),
    likedAt: row.liked_at?.toISOString(),
    // 互动态由调用方按 viewer 批量补齐（见 interactions/flags.ts）；
    // 这里给出匿名默认值，避免每个调用点都要拼一份完整对象。
    isLiked: false,
    isBookmarked: false,
  }
}

/** 落库记录：含内部主键（authorId / topicId），服务层据此判权限，对外投影时剔除。 */
export type PostRecord = ReturnType<typeof mapRow>

/**
 * 查询执行器：以最小结构接口注入，使同一段列表 SQL 既能跑在连接池/事务连接上，
 * 也能在测试的 PGlite 内存库里执行（与 interactions 的 Executor 同一思路），
 * 避免「测试另写一份 SQL」的假验证。
 */
export type RowExecutor = {
  query(sql: string, params: unknown[]): Promise<{ rows: PostRow[] }>
}

/** 统一执行入口：允许传入事务连接，使写入与读回在同一事务内完成。 */
export async function queryRows(
  executor: RowExecutor,
  sql: string,
  params: unknown[],
): Promise<PostRecord[]> {
  const result = await executor.query(sql, params)
  return result.rows.map(mapRow)
}
