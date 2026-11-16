// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 审核日志模块对外出口（barrel）。
 * 其他模块只允许经此文件使用日志能力，不得穿透到内部文件（lint R1 强制）。
 * 只导出「写入 / 读取」——没有 update / delete，从接口层保证日志只追加。
 */
export { insertLog, listLogs } from './moderation.repository.js'
export { MODERATION_ACTIONS, type ModerationAction } from './moderation.constants.js'
export type { LogExecutor, LogInput, ModerationLogRow } from './moderation.types.js'
