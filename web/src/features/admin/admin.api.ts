// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet, apiPatch, apiPost } from '../../lib/api-client'
import type {
  AdminContent,
  AdminPage,
  AdminStats,
  AdminTopic,
  AdminUser,
  TopicDraft,
} from '../../types/admin'

/** 统一解包：data 为列表，meta 承载游标，与举报 / 信息流一致。 */
function toPage<T>(envelope: { data: T[]; meta?: unknown }): AdminPage<T> {
  const meta = (envelope.meta ?? {}) as { nextCursor?: unknown; hasMore?: unknown }
  return {
    items: envelope.data,
    nextCursor: typeof meta.nextCursor === 'string' ? meta.nextCursor : null,
    hasMore: meta.hasMore === true,
  }
}

export async function fetchAdminUsers(cursor?: string, signal?: AbortSignal) {
  return toPage(await apiGet<AdminUser[]>('admin/users', { signal, params: { cursor } }))
}

export async function setUserStatus(id: number, status: 'suspended' | 'active') {
  return (await apiPatch<AdminUser>(`admin/users/${id}/status`, { status })).data
}

export async function fetchAdminContent(kind: 'posts' | 'comments', cursor?: string, signal?: AbortSignal) {
  return toPage(
    await apiGet<AdminContent[]>(`admin/content/${kind}`, { signal, params: { cursor } }),
  )
}

export async function setContentStatus(
  kind: 'posts' | 'comments',
  id: number,
  status: 'removed' | 'published',
) {
  return (await apiPatch<AdminContent>(`admin/content/${kind}/${id}/status`, { status })).data
}

export async function fetchAdminTopics(signal?: AbortSignal): Promise<AdminTopic[]> {
  return (await apiGet<AdminTopic[]>('admin/topics', { signal })).data
}

export async function createTopic(draft: TopicDraft): Promise<AdminTopic> {
  return (await apiPost<AdminTopic>('admin/topics', draft)).data
}

export async function updateTopic(id: number, draft: Omit<TopicDraft, 'slug'>): Promise<AdminTopic> {
  return (await apiPatch<AdminTopic>(`admin/topics/${id}`, draft)).data
}

export async function setTopicArchived(id: number, archived: boolean): Promise<AdminTopic> {
  return (await apiPatch<AdminTopic>(`admin/topics/${id}/archive`, { archived })).data
}

export async function fetchAdminStats(signal?: AbortSignal): Promise<AdminStats> {
  return (await apiGet<AdminStats>('admin/stats', { signal })).data
}
