import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api-client'
import type { FeedPost, PostDetail } from '../../types/api'

/** 帖子写读接口：只描述路径与载荷，传输与错误归一化由 api-client 统一承担。 */

export type CreatePostPayload = {
  title: string
  body: string
  topicId: number
}

/** 编辑仅提交变更字段；服务端要求至少提供一个字段。 */
export type UpdatePostPayload = Partial<CreatePostPayload>

export async function fetchPostDetail(
  id: number,
  signal?: AbortSignal,
): Promise<PostDetail> {
  const envelope = await apiGet<PostDetail>(`posts/${id}`, { signal })
  return envelope.data
}

export async function fetchRelatedPosts(
  id: number,
  signal?: AbortSignal,
): Promise<FeedPost[]> {
  const envelope = await apiGet<FeedPost[]>(`posts/${id}/related`, { signal })
  return envelope.data
}

export async function createPost(payload: CreatePostPayload): Promise<PostDetail> {
  const envelope = await apiPost<PostDetail>('posts', payload)
  return envelope.data
}

export async function updatePost(
  id: number,
  payload: UpdatePostPayload,
): Promise<PostDetail> {
  const envelope = await apiPatch<PostDetail>(`posts/${id}`, payload)
  return envelope.data
}

export async function deletePost(id: number): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`posts/${id}`)
}
