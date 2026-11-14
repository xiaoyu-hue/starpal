// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 举报 / 申诉常量。
 * 从 constants.ts 拆出：后者已接近行数预算（≤300 行），且本组枚举自成体系。
 * 枚举值须与 011_reports.sql 的 CHECK 约束、前端 types/reports.ts 保持一致；
 * 三者分离定义由集成测试与 DOC_SYNC 约束，不引入共享运行时依赖。
 */

/** 诉求种类：举报指向具体内容；申诉不指向目标（暂无可挂靠的处置记录）。 */
export const REPORT_KINDS = ['report', 'appeal'] as const
export type ReportKind = (typeof REPORT_KINDS)[number]

/** 举报目标类型：多态，服务层校验存在性与可见性。 */
export const REPORT_TARGET_TYPES = ['post', 'comment'] as const
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number]

/** 处理状态：pending → resolved / dismissed，终态不可再改。 */
export const REPORT_STATUSES = ['pending', 'resolved', 'dismissed'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

/** 管理员决策动作：resolve = 采纳并标记已处理；dismiss = 驳回。 */
export const REPORT_DECISIONS = ['resolve', 'dismiss'] as const
export type ReportDecision = (typeof REPORT_DECISIONS)[number]

/** 举报原因（申诉不使用，固定为 appeal）。 */
export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'copyright', 'other'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]
export const APPEAL_REASON = 'appeal'

/** 说明与答复长度上限，防止超长文本拖垮列表与备份。 */
export const REPORT_DETAIL_MIN = 5
export const REPORT_DETAIL_MAX = 1000
export const REPORT_NOTE_MAX = 500

/** 列表分页：与信息流同口径的键集游标。 */
export const REPORT_PAGE_SIZE = 20
export const REPORT_MAX_PAGE_SIZE = 50
