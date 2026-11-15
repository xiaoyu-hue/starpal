// SPDX-License-Identifier: AGPL-3.0-or-later
export { levelRouter } from './level.routes.js'
export { getLevel } from './level.service.js'
export type { LevelProgress, LevelView } from './level.service.js'
export {
  LEVEL_BASIS,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  RANKS,
  XP_WEIGHTS,
  computeExperience,
  levelOf,
  rankOf,
  thresholdOf,
} from './level.rules.js'
export type { Rank, RankKey } from './level.rules.js'
