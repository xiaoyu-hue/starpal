// SPDX-License-Identifier: AGPL-3.0-or-later
import { DELETED_DISPLAY_NAME } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { collectMetrics, toMetrics, type MetricsExecutor } from '../../shared/metrics.js'
import { findLevelUser, raiseTopLevel } from './level.repository.js'
import { LEVEL_BASIS, computeExperience, levelOf, rankOf } from './level.rules.js'

/** 对外：一个成员的等级与段位。 */
export type LevelProgress = {
  /** `1`–`50`，已经过「只升不降」修正。 */
  level: number
  /** 段位中文名（萌新 / 入门 / 常客 / 老友 / 元老）。 */
  rank: string
  /** 当前累计经验。刻意不给「下一级门槛」与进度百分比——那是催促。 */
  experience: number
}

/** 对外视图。`progress` 为 null 表示不展示（已注销账户）。 */
export type LevelView = {
  username: string
  displayName: string
  progress: LevelProgress | null
  /** 等级怎么来的，服务端生成，前端不复制文案。 */
  basis: string
}

/**
 * 读取某成员的等级。
 *
 * **读时算 + 只升不降**：经验由 `shared/metrics` 的七个指标现算，与成就同一套口径，
 * 不额外维护一张经验流水表（那需要给发帖 / 评论 / 点赞 / 私信四条写入链路各加一处累加，
 * 漏一处就会长期少算，而且历史数据要回填）。
 *
 * 现算的代价是「经验会退」：取消点赞、删帖、删评论都会让总数下降。
 * 所以等级取 `max(现算等级, users.top_level)`，晋级时顺手把 `top_level` 抬上去。
 * 这是一次读操作的写副作用，与成就解锁同一套处理，只在真正晋级的那一次发生。
 *
 * 已注销账户返回 `progress: null`：公开页仍可打开（历史内容还在），但不该再展示资历。
 * 停用账户按不存在处理，不泄露「此号存在但被停」。
 */
export async function getLevel(
  username: string,
  executor?: MetricsExecutor,
): Promise<LevelView> {
  const user = await findLevelUser(username, executor)
  if (!user || user.status === 'suspended') {
    throw new DomainError('NOT_FOUND', '用户不存在')
  }

  if (user.status === 'deleted') {
    return {
      username,
      displayName: DELETED_DISPLAY_NAME,
      progress: null,
      basis: LEVEL_BASIS,
    }
  }

  const metricsRow = await collectMetrics(user.id, executor)
  // 竞态兜底：上面查到了行，这里查不到，说明期间被物理删除（运维操作）。
  // 按不存在处理，而不是拿 0 经验硬算出一个 L1——那会把「查不到」伪装成「你是新人」。
  if (!metricsRow) {
    throw new DomainError('NOT_FOUND', '用户不存在')
  }

  const experience = computeExperience(toMetrics(metricsRow))
  const current = levelOf(experience)
  const effective = Math.max(current, user.top_level)

  if (current > user.top_level) {
    await raiseTopLevel(user.id, current, executor)
  }

  return {
    username,
    displayName: user.display_name,
    progress: { level: effective, rank: rankOf(effective).nameZh, experience },
    basis: LEVEL_BASIS,
  }
}
