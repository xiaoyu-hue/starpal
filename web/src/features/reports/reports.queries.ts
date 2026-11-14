// SPDX-License-Identifier: AGPL-3.0-or-later
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportKeys } from '../../lib/query-keys'
import type { DecisionPayload, ReportStatus, SubmitReportPayload } from '../../types/reports'
import { decideOnReport, fetchMyReports, fetchReportQueue, submitReport } from './reports.api'

/** 我的提交：键集游标分页，与收藏/点赞列表同构。 */
export function useMyReportsQuery() {
  return useInfiniteQuery({
    queryKey: reportKeys.mine,
    queryFn: ({ pageParam, signal }) => fetchMyReports(pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  })
}

/** 管理队列：状态作为键的一部分，切换筛选不复用上一状态的缓存。 */
export function useReportQueueQuery(status: ReportStatus | null) {
  return useInfiniteQuery({
    queryKey: reportKeys.queue(status),
    queryFn: ({ pageParam, signal }) => fetchReportQueue(status, pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  })
}

/** 提交后失效「我的提交」，让列表立刻出现新条目。 */
export function useSubmitReportMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: SubmitReportPayload) => submitReport(payload),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: reportKeys.all })
    },
  })
}

/** 决策后失效队列与数量，避免管理页显示过期状态。 */
export function useDecisionMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DecisionPayload }) =>
      decideOnReport(id, payload),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: reportKeys.all })
    },
  })
}
