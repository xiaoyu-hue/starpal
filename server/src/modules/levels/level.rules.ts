// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 等级规则（M5.5-S2）。
 *
 * 两个概念，界面上分开显示，不要混：
 * - **等级**：`L1`–`L50`，由累计经验派生，是一个连续刻度；
 * - **段位**：等级落在哪一段，`萌新 / 入门 / 常客 / 老友 / 元老`，给人读的粗标签。
 *
 * 段位刻意不叫「头衔」——`users.titles` 那一套（社区长 / 创始人 / 管理员）已经占了
 * 「头衔」这个词，指的是站长身份。同一个词指两种东西，用户会分不清哪个是权力、哪个是资历。
 *
 * 全部是纯函数：不查库、不看时间、不看登录态。同一个 `Metrics` 永远得同一个等级，
 * 这样才能拿单测把「L50 门槛到底是多少」钉死，而不是靠手点页面目测。
 */

import type { Metric, Metrics } from '../../shared/metrics.js'

/** 等级上限。与迁移 019 的 `CHECK (top_level BETWEEN 1 AND 50)` 必须一致。 */
export const MAX_LEVEL = 50

/**
 * 每级所需经验的**增量**，三段式：前松、中稳、后紧。
 *
 * - `L2`–`L10` 每级 20：新人发两篇帖、留几条评论就能连着升好几级，前三天就能看到反馈。
 *   等级系统最怕的是「注册了一周还是一级」，那等于告诉新人这儿没什么可做的。
 * - `L11`–`L30` 每级 40：进入常态区间，升一级大约要一周的认真参与。
 * - `L31`–`L50` 每级 60：后 20 级是长期刻度，让「元老」真的稀缺。
 *
 * 累计结果：`L10 = 180`、`L30 = 980`、`L50 = 2180`（由 `LEVEL_THRESHOLDS` 现算，勿手抄）。
 */
const STEPS = [
  { upTo: 10, step: 20 },
  { upTo: 30, step: 40 },
  { upTo: MAX_LEVEL, step: 60 },
] as const

/** 每一级的累计经验门槛，下标 0 对应 `L1`（恒为 0）。 */
function buildThresholds(): readonly number[] {
  const thresholds: number[] = [0]
  let total = 0
  for (let level = 2; level <= MAX_LEVEL; level += 1) {
    // 断言安全：STEPS 的最后一档 upTo 就是 MAX_LEVEL，逐级必然命中。
    const band = STEPS.find((item) => level <= item.upTo)!
    total += band.step
    thresholds.push(total)
  }
  return thresholds
}

export const LEVEL_THRESHOLDS: readonly number[] = buildThresholds()

/** 某等级的累计经验门槛；越界时收敛到合法区间，不抛错（宁可显示 L1/L50 也不让页面崩）。 */
export function thresholdOf(level: number): number {
  const index = Math.min(Math.max(Math.trunc(level), 1), MAX_LEVEL) - 1
  return LEVEL_THRESHOLDS[index]!
}

/** 经验换算等级：取「门槛 ≤ 经验」的最高一级。 */
export function levelOf(experience: number): number {
  if (!Number.isFinite(experience) || experience <= 0) return 1
  let level = 1
  for (let candidate = 2; candidate <= MAX_LEVEL; candidate += 1) {
    if (experience < LEVEL_THRESHOLDS[candidate - 1]!) break
    level = candidate
  }
  return level
}

export type RankKey = 'newcomer' | 'starter' | 'regular' | 'friend' | 'veteran'

export type Rank = {
  key: RankKey
  /** 中文段位名，直接展示，前端不复制一份。 */
  nameZh: string
  /** 该段位覆盖的最高等级。 */
  maxLevel: number
}

/**
 * 五个段位。命名取「温和、可对外」的一路：
 * 萌新 → 入门 → 常客 → 老友 → 元老，递进讲的是「你跟这里的熟悉程度」，
 * 不含贬义，也不带权力意味——权力只由 `role` 与「头衔」表达。
 */
export const RANKS: readonly Rank[] = [
  { key: 'newcomer', nameZh: '萌新', maxLevel: 10 },
  { key: 'starter', nameZh: '入门', maxLevel: 20 },
  { key: 'regular', nameZh: '常客', maxLevel: 30 },
  { key: 'friend', nameZh: '老友', maxLevel: 40 },
  { key: 'veteran', nameZh: '元老', maxLevel: MAX_LEVEL },
]

/** 等级所属段位；越界同样收敛，不抛错。 */
export function rankOf(level: number): Rank {
  const safe = Math.min(Math.max(Math.trunc(level), 1), MAX_LEVEL)
  return RANKS.find((rank) => safe <= rank.maxLevel) ?? RANKS[RANKS.length - 1]!
}

/** 段位覆盖的最低等级：`萌新` 从 `L1` 起，其余接在前一段的 `maxLevel` 之后。 */
export function minLevelOf(rank: Rank): number {
  const index = RANKS.findIndex((item) => item.key === rank.key)
  return index <= 0 ? 1 : RANKS[index - 1]!.maxLevel + 1
}

/**
 * 已解锁的段位。
 *
 * 「解锁」不需要单独记录：等级只升不降，`top_level` 就是历史最高，
 * 所以到过 `L29` 的人必然经过萌新、入门、常客三段，这三段永久可用。
 * 一旦 `top_level` 到了某一段，它就再也不会退回去——这正是「解锁后永久」的实现。
 */
export function unlockedRanks(topLevel: number): readonly Rank[] {
  const safe = Math.min(Math.max(Math.trunc(topLevel), 1), MAX_LEVEL)
  return RANKS.filter((rank) => safe >= minLevelOf(rank))
}

/** 段位键校验：请求体里的值先过这里，非法值一律当校验失败，不静默忽略。 */
export function isRankKey(value: unknown): value is RankKey {
  return typeof value === 'string' && RANKS.some((rank) => rank.key === value)
}

/** 按 key 取段位定义；不存在返回 null（调用方决定当校验失败还是当「不戴」）。 */
export function rankByKey(key: string): Rank | null {
  return RANKS.find((rank) => rank.key === key) ?? null
}

/**
 * 七个指标的经验权重。
 *
 * 数字背后的判断：
 * - **发帖 10** 是主要贡献；**评论 3** 鼓励回应，但比发帖便宜，防止「刷评论」压过写东西。
 * - **覆盖话题 15/个（最多 5 个）** 奖励多样化。封顶是因为不封顶时，话题越多分越高，
 *   会诱导「每篇帖换个话题」这种机械行为。
 * - **收到赞 2** 是他人认可，权重低于发帖一半——被喜欢是结果，不是可以自己刷的动作。
 * - **邀请成功 20** 是社区增长贡献，一次性行为，给高一点不会形成刷量。
 * - **私信 0**：私信是两人之间的事，不构成公共贡献，也不该成为刷等级的通道。
 *   指标本身仍保留（成就判定要用），只是不换算成经验。
 * - **加入天数 1/天、封顶 100**：陪伴也是参与，但必须封顶，否则「注册早」能白拿几十级，
 *   等级就退化成注册时间戳。
 */
export const XP_WEIGHTS: Readonly<Record<Metric, number>> = {
  posts_published: 10,
  comments_published: 3,
  topics_covered: 15,
  likes_received: 2,
  messages_sent: 0,
  invites_used: 20,
  days_since_join: 1,
}

/** 话题数计入经验的上限。 */
export const TOPICS_CAP = 5
/** 加入天数计入经验的上限（天）。 */
export const DAYS_CAP = 100

/** 累计经验：七项加权求和，两项封顶。结果恒为非负整数。 */
export function computeExperience(metrics: Metrics): number {
  const topics = Math.min(metrics.topics_covered, TOPICS_CAP)
  const days = Math.min(metrics.days_since_join, DAYS_CAP)
  const total =
    metrics.posts_published * XP_WEIGHTS.posts_published +
    metrics.comments_published * XP_WEIGHTS.comments_published +
    topics * XP_WEIGHTS.topics_covered +
    metrics.likes_received * XP_WEIGHTS.likes_received +
    metrics.messages_sent * XP_WEIGHTS.messages_sent +
    metrics.invites_used * XP_WEIGHTS.invites_used +
    days * XP_WEIGHTS.days_since_join
  return Math.max(0, Math.round(total))
}

/**
 * 等级说明：写在卡片角落的一句话。
 *
 * 只说「怎么来的」，不说「还差多少」——精确进度会变成催促，越界到
 * PRD `FR-ACH-04` 要避免的成瘾设计。
 */
export const LEVEL_BASIS = '按发帖、评论、收到的赞、覆盖的话题、邀请与加入天数累计，只升不降。'
