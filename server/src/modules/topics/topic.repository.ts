import type { QueryResultRow } from 'pg'
import { pool } from '../../db/pool.js'
import type { TopicSummary } from './topic.types.js'

/**
 * 话题列表查询。
 *
 * 计数口径必须与帖子列表的可见性条件一致（`post.projection.ts` 的 VISIBLE），
 * 否则会出现「话题页显示 3 篇、点进去只有 2 篇」的对不上的情况：
 * 这里同样只计已发布、未软删除、作者未被停用的帖子。
 * 单条聚合语句完成，不做逐话题 COUNT，避免 N+1。
 */
const LIST_SQL = `
  SELECT
    t.id,
    t.slug,
    t.name_zh,
    t.name_en,
    t.description,
    t.icon,
    t.sort_order,
    COUNT(u.id)::int AS post_count
  FROM topics t
  LEFT JOIN posts p
    ON p.topic_id = t.id
   AND p.status = 'published'
   AND p.deleted_at IS NULL
  LEFT JOIN users u
    ON u.id = p.author_id
   AND u.status <> 'suspended'
  WHERE t.deleted_at IS NULL
  GROUP BY t.id
  ORDER BY t.sort_order ASC, t.id ASC
`

type TopicRow = QueryResultRow & {
  id: number
  slug: string
  name_zh: string
  name_en: string
  description: string | null
  icon: string | null
  sort_order: number
  post_count: number
}

function toSummary(row: TopicRow): TopicSummary {
  return {
    id: row.id,
    slug: row.slug,
    nameZh: row.name_zh,
    nameEn: row.name_en,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    postCount: row.post_count,
  }
}

export async function listTopics(): Promise<TopicSummary[]> {
  const result = await pool.query<TopicRow>(LIST_SQL)
  return result.rows.map(toSummary)
}
