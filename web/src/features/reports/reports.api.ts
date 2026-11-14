// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet, apiPost } from '../../lib/api-client'
import type {
  DecisionPayload,
  ReportItem,
  ReportPage,
  ReportQueueItem,
  ReportStatus,
  SubmitReportPayload,
} from '../../types/reports'

/** 统一解包：data 为列表，meta 承载游标，与信息流一致。 */
function toPage<T>(envelope: { data: T[]; meta?: unknown }): ReportPage<T> {
  const meta = (envelope.meta ?? {}) as { nextCursor?: unknown; hasMore?: unknown }
  return {
    items: envelope.data,
    nextCursor: typeof meta.nextCursor === 'string' ? meta.nextCursor : null,
    hasMore: meta.hasMore === true,
  }
}

/** 提交举报或申诉：身份由服务端会话判定，请求体不含任何用户标识。 */
export async function submitReport(payload: SubmitReportPayload): Promise<ReportItem> {
  const envelope = await apiPost<ReportItem>('reports', payload)
  return envelope.data
}

/** 我的提交：服务端只按登录者过滤，客户端不传用户标识。 */
export async function fetchMyReports(
  cursor?: string,
  signal?: AbortSignal,
): Promise<ReportPage<ReportItem>> {
  return toPage(
    await apiGet<ReportItem[]>('reports/mine', { signal, params: { cursor } }),
  )
}

/** 管理队列：仅管理员可调用；状态过滤在服务端完成。 */
export async function fetchReportQueue(
  status: ReportStatus | null,
  cursor?: string,
  signal?: AbortSignal,
): Promise<ReportPage<ReportQueueItem>> {
  return toPage(
    await apiGet<ReportQueueItem[]>('admin/reports', {
      signal,
      params: { status: status ?? undefined, cursor },
    }),
  )
}

/** 决策：resolve = 已处理，dismiss = 已驳回；终态由服务端条件更新保证不可重决。 */
export async function decideOnReport(
  id: number,
  payload: DecisionPayload,
): Promise<ReportItem> {
  const envelope = await apiPost<ReportItem>(`admin/reports/${id}/decision`, payload)
  return envelope.data
}
