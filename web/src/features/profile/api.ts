// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api-client'
import type {
  FeedPost,
  OwnProfile,
  ProfileUpdatePayload,
  PublicProfile,
  UserPostsPage,
} from '../../types/api'

/** 个人资料接口：只描述路径与载荷，传输与错误归一化由 api-client 统一承担。 */

type ProfileData = { profile: PublicProfile }
type OwnProfileData = { profile: OwnProfile }

/** 公开个人资料投影：未登录可读，不含内部字段。 */
export async function fetchPublicProfile(username: string): Promise<PublicProfile> {
  const envelope = await apiGet<ProfileData>(`users/${encodeURIComponent(username)}`)
  return envelope.data.profile
}

/** 公开个人页帖子：服务端游标分页，响应形状与 /api/posts 同构。 */
export async function fetchUserPosts(
  username: string,
  cursor?: string | null,
  signal?: AbortSignal,
): Promise<UserPostsPage> {
  const envelope = await apiGet<FeedPost[]>(`users/${encodeURIComponent(username)}/posts`, {
    signal,
    params: { cursor: cursor ?? undefined },
  })
  const meta = (envelope.meta ?? {}) as { nextCursor?: unknown; hasMore?: unknown }
  return {
    items: envelope.data,
    nextCursor: typeof meta.nextCursor === 'string' ? meta.nextCursor : null,
    hasMore: meta.hasMore === true,
  }
}

/** 本人完整资料（含可选字段真实值与公开开关）。 */
export async function fetchOwnProfile(): Promise<OwnProfile> {
  const envelope = await apiGet<OwnProfileData>('users/me')
  return envelope.data.profile
}

/** 更新本人资料：仅提交变更字段。 */
export async function updateOwnProfile(payload: ProfileUpdatePayload): Promise<OwnProfile> {
  const envelope = await apiPatch<OwnProfileData>('users/me', payload)
  return envelope.data.profile
}

/** 软删除本人账号。 */
export async function deleteOwnAccount(): Promise<void> {
  await apiDelete<{ deleted: boolean }>('users/me')
}

/** 彻底擦除本人数据。 */
export async function eraseOwnAccount(): Promise<void> {
  await apiPost<{ erased: boolean }>('users/me/erase')
}
