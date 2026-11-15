// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 成就相关类型（M5-S2）。
 * 从 `types/api.ts` 拆出：该文件已接近 300 行预算，成就结构自成一域，独立更易读。
 * `api.ts` 仍 re-export，既有导入路径不受影响。
 */

/** 单条成就：未解锁时 `unlockedAt` 为 null，`goal` 是服务端生成的条件描述。 */
export type AchievementItem = {
  code: string
  nameZh: string
  description: string
  icon: string
  goal: string
  unlockedAt: string | null
}

/** 某人成就时间线：已解锁在前（按解锁时间倒序），未解锁在后。 */
export type AchievementTimeline = {
  username: string
  displayName: string
  unlockedCount: number
  totalCount: number
  items: AchievementItem[]
}
