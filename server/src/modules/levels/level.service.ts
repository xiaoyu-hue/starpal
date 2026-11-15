// SPDX-License-Identifier: AGPL-3.0-or-later
import { DELETED_DISPLAY_NAME } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { collectMetrics, toMetrics, type MetricsExecutor } from '../../shared/metrics.js'
import { findLevelUser, findTopLevelById, raiseTopLevel, setEquippedRank } from './level.repository.js'
import {
  LEVEL_BASIS,
  RANKS,
  computeExperience,
  isRankKey,
  levelOf,
  minLevelOf,
  rankByKey,
  rankOf,
  unlockedRanks,
  type RankKey,
} from './level.rules.js'

/** 对外：一个成员佩戴在名字旁的段位徽标。`null` 表示没戴。 */
export type RankBadge = {
  key: RankKey
  /** 中文段位名，直接展示。 */
  nameZh: string
}

/** 设置页渲染一个选项所需的全部信息。 */
export type RankOption = {
  key: RankKey
  nameZh: string
  /** 解锁所需的最低等级。 */
  minLevel: number
  /** 当前是否已解锁（= 等级是否到过这一段）。 */
  unlocked: boolean
}

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
  /** 佩戴中的段位徽标；没戴或佩戴值已失效时为 null。 */
  badge: RankBadge | null
  /**
   * 五个段位目录，带 `unlocked` 标记，供设置页渲染选项。
   * 由服务端下发而不是前端硬编码：段位名与门槛只在 `level.rules.ts` 有一份真源。
   */
  catalog: RankOption[]
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
      badge: null,
      catalog: catalogFor(1).map((item) => ({ ...item, unlocked: false })),
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

  // 佩戴值可能落在已解锁范围之外：正常不会（只升不降 + 服务层写入校验），
  // 但手工改库或未来规则调整都可能造成历史数据越界。这时按「没戴」处理——
  // 宁可少显示一个徽标，也不能在页面上挂出用户还没资格拥有的段位。
  const worn = user.equipped_rank ? rankByKey(user.equipped_rank) : null
  const badge: RankBadge | null =
    worn && effective >= minLevelOf(worn) ? { key: worn.key, nameZh: worn.nameZh } : null

  return {
    username,
    displayName: user.display_name,
    progress: { level: effective, rank: rankOf(effective).nameZh, experience },
    badge,
    catalog: catalogFor(effective),
    basis: LEVEL_BASIS,
  }
}

/**
 * 设置自己佩戴的段位；`null` 表示摘下来。
 *
 * 三条规则：
 * - 只能戴**已解锁**的段位。解锁由 `top_level` 派生，未到过的段位直接拒绝，
 *   而不是静默不生效——用户点了「老友」却什么都没发生，比报错更让人困惑。
 * - 可以戴比自己当前等级更低的段位。有人 `L45` 愿意自称「常客」，那是他的选择；
 *   等级牌仍如实显示 `LV 45`，两者不一致是刻意的，不做「修正」。
 * - 已注销 / 停用账户不允许改：与公开视图口径一致，这类账户不再展示资历。
 */
export async function setOwnRank(
  userId: string,
  raw: unknown,
  executor?: MetricsExecutor,
): Promise<{ badge: RankBadge | null }> {
  // `undefined` 与 `null` 语义不同：前者是「没传这个字段」，后者是「显式摘下」。
  if (raw === undefined) {
    throw new DomainError('VALIDATION_FAILED', '缺少 rank 字段')
  }
  if (raw !== null && !isRankKey(raw)) {
    throw new DomainError('VALIDATION_FAILED', '段位不存在')
  }

  const topLevel = await findTopLevelById(userId, executor)
  if (topLevel === null) {
    throw new DomainError('NOT_FOUND', '用户不存在')
  }

  if (raw !== null) {
    const target = rankByKey(raw)!
    if (topLevel < minLevelOf(target)) {
      throw new DomainError(
        'FORBIDDEN',
        `「${target.nameZh}」尚未解锁：需要达到 L${minLevelOf(target)}`,
      )
    }
  }

  await setEquippedRank(userId, raw, executor)
  const picked = raw === null ? null : rankByKey(raw)!
  return { badge: picked ? { key: picked.key, nameZh: picked.nameZh } : null }
}

/** 段位目录 + 解锁状态。`unlockedRanks` 与这里同源，避免两处各判一次。 */
function catalogFor(level: number): RankOption[] {
  const unlocked = new Set(unlockedRanks(level).map((rank) => rank.key))
  return RANKS.map((rank) => ({
    key: rank.key,
    nameZh: rank.nameZh,
    minLevel: minLevelOf(rank),
    unlocked: unlocked.has(rank.key),
  }))
}
