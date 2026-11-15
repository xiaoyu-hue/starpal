// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 成就判定引擎（M5-S2）。
 *
 * 设计边界：引擎只认「指标 + 阈值」，不认识具体成就。
 * 新增成就 = 往 achievements 表插一行；新增**指标**才需要改这里，属于代码变更。
 * 这样 PRD `FR-ACH-01`「新增称号无须改动业务代码」在数据侧成立。
 */

/** 指标注册表：每个键都对应 repository 里一段可执行的统计 SQL，两者必须同步增减。 */
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

/** 一次性算好的全部指标值，判定时只在内存里比较，不再逐条查库。 */
export type Metrics = Record<Metric, number>

/** 库中 condition 列的结构：一条成就只有一个指标与一个阈值。 */
export type Condition = { metric: Metric; gte: number }

export function isKnownMetric(value: unknown): value is Metric {
  return typeof value === 'string' && (METRIC_IDS as readonly string[]).includes(value)
}

/**
 * 把库里的 JSONB 收敛成 Condition。
 * 未知指标一律视为「不成立」，而不是抛错——单条数据写坏不该让整页时间线 500。
 * 数据正确性由「种子行指标必须存在于注册表」的测试保证。
 */
export function parseCondition(raw: unknown): Condition | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { metric, gte } = raw as Record<string, unknown>
  if (!isKnownMetric(metric)) return null
  if (typeof gte !== 'number' || !Number.isFinite(gte)) return null
  return { metric, gte }
}

/** 是否达标：当前指标值 ≥ 阈值。 */
export function isSatisfied(condition: Condition, metrics: Metrics): boolean {
  return metrics[condition.metric] >= condition.gte
}

/**
 * 条件的人话描述。
 * 刻意只描述目标，不描述「还差多少」：精确进度会变成催促式追踪，越界到 PRD `FR-ACH-04`
 * 要避免的成瘾设计。展示侧统一用它，前端不复制一份文案。
 */
const DESCRIBERS: Record<Metric, (gte: number) => string> = {
  posts_published: (gte) => `发布 ${gte} 篇帖子`,
  comments_published: (gte) => `发表 ${gte} 条评论`,
  topics_covered: (gte) => `在 ${gte} 个不同话题里发过帖`,
  likes_received: (gte) => `累计收到 ${gte} 个赞`,
  messages_sent: (gte) => `发出 ${gte} 条私信`,
  invites_used: (gte) => `邀请码被使用 ${gte} 次`,
  days_since_join: (gte) => `加入满 ${gte} 天`,
}

export function describeCondition(condition: Condition): string {
  return DESCRIBERS[condition.metric](condition.gte)
}
