// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 举报 / 申诉模块对外出口（barrel）。
 * 其他模块只允许经此文件引用，不得穿透到内部文件（lint R1 强制）。
 * 仓储层仅供本模块与测试（测试目录不受 R1 约束）直接引用，不对业务模块暴露。
 */
export { reportRouter } from './report.routes.js'
export {
  adminReportsController,
  decideReportController,
  myReportsController,
  submitReportController,
} from './report.controller.js'
export type {
  Actor,
  DecisionInput,
  ReportItem,
  ReportListQuery,
  ReportPage,
  ReportQueueItem,
  ReportRow,
  SubmitReportInput,
} from './report.types.js'
