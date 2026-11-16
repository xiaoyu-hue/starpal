// SPDX-License-Identifier: AGPL-3.0-or-later
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '../../lib/query-keys'
import {
  createTopic,
  fetchAdminContent,
  fetchAdminStats,
  fetchAdminTopics,
  fetchAdminUsers,
  setContentStatus,
  setTopicArchived,
  setUserStatus,
  updateTopic,
} from './admin.api'
import type { TopicDraft } from '../../types/admin'

export function useAdminUsersQuery() {
  return useInfiniteQuery({
    queryKey: adminKeys.users,
    queryFn: ({ pageParam, signal }) => fetchAdminUsers(pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
  })
}

export function useAdminContentQuery(kind: 'posts' | 'comments') {
  return useInfiniteQuery({
    queryKey: adminKeys.content(kind),
    queryFn: ({ pageParam, signal }) => fetchAdminContent(kind, pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
  })
}

export function useAdminTopicsQuery() {
  return useQuery({ queryKey: adminKeys.topics, queryFn: ({ signal }) => fetchAdminTopics(signal) })
}

export function useAdminStatsQuery() {
  return useQuery({ queryKey: adminKeys.stats, queryFn: ({ signal }) => fetchAdminStats(signal) })
}

/** 任一管理写操作成功后整体失效管理域，让所有列表与统计数字回到最新。 */
function useInvalidateAdmin() {
  const client = useQueryClient()
  return () => void client.invalidateQueries({ queryKey: adminKeys.all })
}

export function useSetUserStatusMutation() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'suspended' | 'active' }) =>
      setUserStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useSetContentStatusMutation() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({
      kind,
      id,
      status,
    }: {
      kind: 'posts' | 'comments'
      id: number
      status: 'removed' | 'published'
    }) => setContentStatus(kind, id, status),
    onSuccess: invalidate,
  })
}

export function useCreateTopicMutation() {
  const invalidate = useInvalidateAdmin()
  return useMutation({ mutationFn: (draft: TopicDraft) => createTopic(draft), onSuccess: invalidate })
}

export function useUpdateTopicMutation() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, draft }: { id: number; draft: Omit<TopicDraft, 'slug'> }) =>
      updateTopic(id, draft),
    onSuccess: invalidate,
  })
}

export function useSetTopicArchivedMutation() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      setTopicArchived(id, archived),
    onSuccess: invalidate,
  })
}
