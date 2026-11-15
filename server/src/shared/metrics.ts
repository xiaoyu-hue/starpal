// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 参与度指标（M5-S2 抽出，M5.5-S2 复用）。
 *
 * 这里定义的是「一个成员在社区里做过多少事」的七个可量化事实，属于跨模块共享数据：
 * 成就判定拿它比阈值，等级换算拿它加权求和。抽到 shared 是为了让两处**读同一份 SQL** ——
 * 复制一份到等级模块，指标口径迟早分叉（比如某处漏了 `deleted_at IS NULL`），
 * 页面就会出现「成就算你在三个话题发过帖、等级却说你只发了两个」。
 *
 * 本文件不 import 任何 `modules/*`：执行器只要求结构上有 `query`，
 * 谁传进来都行（线上是连接池，测试是 PGlite）。反向依赖会让 shared 变成 modules 的下游。
 */

import { pool } from '../db/pool.js'

/** 指标注册表：每个键都对应下面 SQL 里的一段统计，两者必须同步增减。 */
export const METRIC_IDS = [
  'posts_published',
  'comments_published',
  'topics_covered',
  'likes_received',
  'messages_sent',
  'invites_used',
  'days_since_join',
] as const

export type Metric = (typeof METRIC_IDS)[number]

/** 一次性算好的全部指标值。 */
export type Metrics = Record<Metric, number>

/** 库表行：七个指标 + 账户状态（调用方要区分正常 / 停用 / 已注销）。 */
export type MetricsRow = Metrics & { status: string }

/**
 * 查询执行器的最小结构类型。
 *
 * 不直接复用 `modules/posts` 里的 `RowExecutor`：那会把 shared 绑到某个业务模块上。
 * 结构化类型保证连接池与 PGlite 都能直接传入，无需适配层。
 */
export type MetricsExecutor = {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>
}

/**
 * 一次查询算完七个指标。
 *
 * 为什么用标量子查询而不是七次往返：判定要在每次访问成就页 / 资料页 / 个人页时执行，
 * 七次串行往返在 Serverless 冷启动下会明显拖慢首屏；单条语句在库里并行求值，一次出网。
 * 全部 `::int`：count / sum 返回 bigint，pg 驱动会把它读成字符串，转成 int4 才是 number。
 */
const METRICS_SQL = `
  SELECT
    u.status,
    GREATEST(0, floor(extract(epoch FROM (now() - u.created_at)) / 86400))::int AS days_since_join,
    (SELECT count(*) FROM posts p
      WHERE p.author_id = u.id AND p.status = 'published' AND p.deleted_at IS NULL)::int
      AS posts_published,
    (SELECT count(DISTINCT p.topic_id) FROM posts p
      WHERE p.author_id = u.id AND p.status = 'published' AND p.deleted_at IS NULL)::int
      AS topics_covered,
    (SELECT coalesce(sum(p.like_count), 0) FROM posts p
      WHERE p.author_id = u.id AND p.status = 'published' AND p.deleted_at IS NULL)::int
      AS likes_received,
    (SELECT count(*) FROM comments c
      WHERE c.author_id = u.id AND c.status = 'published')::int
      AS comments_published,
    (SELECT count(*) FROM messages m WHERE m.sender_id = u.id)::int AS messages_sent,
    (SELECT count(*) FROM invite_codes ic WHERE ic.used_by = u.id)::int AS invites_used
  FROM users u
  WHERE u.id = $1
`

/** 读取某用户的全部指标；用户不存在返回 null（由服务层转成 NOT_FOUND）。 */
export async function collectMetrics(
  userId: string,
  executor: MetricsExecutor = pool,
): Promise<MetricsRow | null> {
  // 行类型收敛：请求的列由上面 SQL 自己保证，再由集成测试对着真实表结构验证，
  // 而不是靠泛型猜——`query` 的返回被擦成 unknown[]，此处是唯一一次断言。
  const result = await executor.query(METRICS_SQL, [userId])
  const rows = result.rows as MetricsRow[]
  return rows[0] ?? null
}

/** 把行收敛成纯指标（去掉 status），换算与判定都只该看到数字。 */
export function toMetrics(row: MetricsRow): Metrics {
  return {
    posts_published: row.posts_published,
    comments_published: row.comments_published,
    topics_covered: row.topics_covered,
    likes_received: row.likes_received,
    messages_sent: row.messages_sent,
    invites_used: row.invites_used,
    days_since_join: row.days_since_join,
  }
}
