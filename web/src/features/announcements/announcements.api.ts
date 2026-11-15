// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api-client'
import type { AdminAnnouncement, AnnouncementKind, AnnouncementStatus } from '../../types/api'

/** 新建 / 编辑公告的请求体。`body` 每行一条要点，服务端按行拆。 */
export type AnnouncementPayload = {
  kind: AnnouncementKind
  title: string
  summary: string
  body: string
  isPinned: boolean
  status: AnnouncementStatus
}

/** 管理列表：含草稿。整组接口挂在 `/api/admin` 下，由服务端校验管理员角色。 */
export async function fetchAdminAnnouncements(): Promise<AdminAnnouncement[]> {
  const envelope = await apiGet<{ items: AdminAnnouncement[] }>('admin/announcements')
  return envelope.data.items
}

export async function createAnnouncement(
  payload: AnnouncementPayload,
): Promise<AdminAnnouncement> {
  const envelope = await apiPost<AdminAnnouncement>('admin/announcements', payload)
  return envelope.data
}

export async function updateAnnouncement(
  id: number,
  payload: Partial<AnnouncementPayload>,
): Promise<AdminAnnouncement> {
  const envelope = await apiPatch<AdminAnnouncement>(`admin/announcements/${id}`, payload)
  return envelope.data
}

export async function deleteAnnouncement(id: number): Promise<void> {
  await apiDelete(`admin/announcements/${id}`)
}
