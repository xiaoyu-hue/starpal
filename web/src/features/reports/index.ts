// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 举报 / 申诉模块公共出口。
 * 只导出轻量的表单组件与查询 hook（会被 posts 分包引用）；
 * 两个页面按具体路径懒加载，不在此 re-export，避免被并回主包或其它分包。
 */
export { ReportButton } from './ReportButton'
export { useMyReportsQuery, useReportQueueQuery } from './reports.queries'
