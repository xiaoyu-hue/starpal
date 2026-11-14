// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import {
  FROM_JOINS,
  PROJECTION,
  VISIBLE,
  queryRows,
  type PostRecord,
  type RowExecutor,
} from '../posts/index.js'
import type { SearchQuery } from './search.schema.js'

/**
 * 搜索查询：复用信息流的投影与可见性口径（PROJECTION / VISIBLE），
 * 只额外加一条关键词过滤，保证「搜索结果」与「信息流」对同一条帖子是否可见完全一致。
 *
 * 为什么用 ILIKE 而不是 tsvector 全文检索：内容以中文为主，PostgreSQL 默认分词器
 * 不切中文词（整句当一个 token），tsvector 对中文近乎失效；而 pg_trgm 需在 PGlite
 * 构造期声明扩展，会侵入测试基建。小社区数据量下 ILIKE 全表扫描为毫秒级，先够用；
 * 将来数据量增大再加 pg_trgm 索引即可，是增量迁移、不动本接口。
 */

/** 转义 LIKE 通配符（\ % _），使关键词里的这些字符按字面匹配，而非当作模式符。 */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

export type SearchResult = { rows: PostRecord[]; hasMore: boolean }

export async function searchPostsInDb(
  query: SearchQuery,
  executor: RowExecutor = pool,
): Promise<SearchResult> {
  const like = `%${escapeLike(query.q)}%`
  // ESCAPE '\' 让上面转义的 \% \_ 生效；$1 是已拼好的 %关键词% 模式串，$2 控制检索范围。
  const rows = await queryRows(
    executor,
    `SELECT ${PROJECTION} ${FROM_JOINS}
      WHERE ${VISIBLE}
        AND (
          ($2::text = 'all'
             AND (p.title ILIKE $1 ESCAPE '\\' OR p.body ILIKE $1 ESCAPE '\\' OR t.name_zh ILIKE $1 ESCAPE '\\'))
          OR ($2::text = 'post'
             AND (p.title ILIKE $1 ESCAPE '\\' OR p.body ILIKE $1 ESCAPE '\\'))
          OR ($2::text = 'topic' AND t.name_zh ILIKE $1 ESCAPE '\\')
        )
        AND ($3::timestamptz IS NULL OR (p.created_at, p.id) < ($3::timestamptz, $4::bigint))
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $5`,
    [like, query.type, query.cursor?.t ?? null, query.cursor?.id ?? null, query.limit + 1],
  )
  const hasMore = rows.length > query.limit
  return { rows: rows.slice(0, query.limit), hasMore }
}
