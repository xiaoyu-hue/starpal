// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 等级与段位类型（M5.5-S2）。
 *
 * 两个概念别混：`level` 是 L1–L50 的连续刻度，`rank` 是等级落在哪一段的中文名
 * （萌新 / 入门 / 常客 / 老友 / 元老）。「头衔」一词留给站长身份（`users.titles`）。
 */

/** 段位键，与服务端 `level.rules.ts` 的 `RANKS` 同一套枚举。 */
export type RankKey = 'newcomer' | 'starter' | 'regular' | 'friend' | 'veteran'

/** 佩戴在名字旁的段位徽标；`null` 表示没戴。 */
export type RankBadge = {
  key: RankKey
  nameZh: string
}

/** 设置页的一个段位选项：解锁状态与门槛由服务端下发，前端不复制规则。 */
export type RankOption = {
  key: RankKey
  nameZh: string
  minLevel: number
  unlocked: boolean
}

export type LevelProgress = {
  /** `1`–`50`，服务端已按「只升不降」修正过。 */
  level: number
  /** 段位中文名，直接展示。 */
  rank: string
  /**
   * 当前累计经验。刻意不提供「下一级还差多少」与进度百分比：
   * 精确进度会变成催促，越界到 `FR-ACH-04` 要避免的成瘾设计。
   */
  experience: number
}

export type UserLevel = {
  username: string
  displayName: string
  /** 已注销账户为 null——历史内容还在，但不再展示资历。 */
  progress: LevelProgress | null
  /** 佩戴中的段位徽标；未佩戴为 null。 */
  badge: RankBadge | null
  /** 五个段位及其解锁状态，设置页据此渲染选项。 */
  catalog: RankOption[]
  /** 等级怎么来的，服务端生成的一句话，前端不复制文案。 */
  basis: string
}
