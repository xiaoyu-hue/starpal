// SPDX-License-Identifier: AGPL-3.0-or-later
export { levelRouter } from './level.routes.js'
export { getLevel, setOwnRank } from './level.service.js'
export type { LevelProgress, LevelView, RankBadge, RankOption } from './level.service.js'
export { updateRankController } from './level.controller.js'
export {
  LEVEL_BASIS,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  RANKS,
  XP_WEIGHTS,
  computeExperience,
  isRankKey,
  levelOf,
  minLevelOf,
  rankByKey,
  rankOf,
  thresholdOf,
  unlockedRanks,
} from './level.rules.js'
export type { Rank, RankKey } from './level.rules.js'
