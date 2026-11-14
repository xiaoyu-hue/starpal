import { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiUpload } from '../../lib/api-client'
import type { FeedPost, PostDetail, UploadedImage } from '../../types/api'

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

/**
 * 上传一张图片。字段名固定为 `image`，服务端 multer 按此名取文件；
 * 一次一张：多图并发会在服务端触发多次重编码，串行既稳定也能给出准确进度。
 */
export async function uploadPostImage(postId: number, file: File): Promise<UploadedImage> {
  const form = new FormData()
  form.append('image', file, file.name)
  const envelope = await apiUpload<UploadedImage>(`posts/${postId}/images`, form)
  return envelope.data
}

/**
 * 点赞 / 收藏：`PUT` 建立、`DELETE` 撤销，均为幂等。
 * 不提供「切换」接口：显式动作在重放时不会把「赞」翻成「取消赞」。
 */
export async function setPostLike(
  id: number,
  on: boolean,
): Promise<{ liked: boolean; likeCount: number }> {
  const envelope = on
    ? await apiPut<{ liked: boolean; likeCount: number }>(`posts/${id}/like`)
    : await apiDelete<{ liked: boolean; likeCount: number }>(`posts/${id}/like`)
  return envelope.data
}

export async function setPostBookmark(
  id: number,
  on: boolean,
): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  const envelope = on
    ? await apiPut<{ bookmarked: boolean; bookmarkCount: number }>(`posts/${id}/bookmark`)
    : await apiDelete<{ bookmarked: boolean; bookmarkCount: number }>(`posts/${id}/bookmark`)
  return envelope.data
}

/** 移除一张图片（作者或管理员）。 */
export async function deletePostImage(postId: number, imageId: number): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`posts/${postId}/images/${imageId}`)
}
