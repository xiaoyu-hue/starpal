// SPDX-License-Identifier: AGPL-3.0-or-later
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { metaKeys } from '../_static'
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAdminAnnouncements,
  updateAnnouncement,
  type AnnouncementPayload,
} from './announcements.api'

export const adminAnnouncementKeys = {
  list: ['admin', 'announcements'] as const,
}

/**
 * 管理列表：含草稿，按最后修改倒序。
 * 与公开列表用不同的键——它包含草稿，混用缓存会把未发布内容漏给普通读者。
 */
export function useAdminAnnouncementsQuery() {
  return useQuery({
    queryKey: adminAnnouncementKeys.list,
    queryFn: fetchAdminAnnouncements,
  })
}

/**
 * 三个写操作共用一套失效逻辑：管理列表 + 公告页/右栏的公开缓存。
 * 漏掉后者会出现「刚发布，公告页还是旧的」——而运营者往往会立刻去前台核对。
 */
function useInvalidateAnnouncements() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: adminAnnouncementKeys.list })
    void client.invalidateQueries({ queryKey: metaKeys.announcements })
  }
}

export function useCreateAnnouncement() {
  const invalidate = useInvalidateAnnouncements()
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) => createAnnouncement(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateAnnouncement() {
  const invalidate = useInvalidateAnnouncements()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AnnouncementPayload> }) =>
      updateAnnouncement(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteAnnouncement() {
  const invalidate = useInvalidateAnnouncements()
  return useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id),
    onSuccess: invalidate,
  })
}
