import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { feedKeys } from '../feed'
import { profileKeys } from '../profile'
import {
  createPost,
  deletePost,
  deletePostImage,
  fetchPostDetail,
  fetchRelatedPosts,
  updatePost,
  uploadPostImage,
  type CreatePostPayload,
  type UpdatePostPayload,
} from './api'

/** 缓存键按域命名；详情与相关帖子共用帖子 id，保证过期时一起失效。 */
export const postKeys = {
  all: ['post'] as const,
  detail: (id: number) => ['post', 'detail', id] as const,
  related: (id: number) => ['post', 'related', id] as const,
}

export function usePostDetailQuery(id: number) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: ({ signal }) => fetchPostDetail(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}

export function useRelatedPostsQuery(id: number) {
  return useQuery({
    queryKey: postKeys.related(id),
    queryFn: ({ signal }) => fetchRelatedPosts(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}

/**
 * 写入后的失效策略：
 * 帖子变化会影响信息流、个人页帖子数与话题计数，故一并失效；
 * 话题计数与个人资料是低频数据，用 invalidate 而非等待，避免用户看到旧数字。
 * 导出供「创建后立即上传图片」这类跨步骤流程复用——那些步骤不在 mutation 内。
 */
export function useInvalidateContent() {
  const client = useQueryClient()
  return async (postId?: number) => {
    await Promise.all([
      client.invalidateQueries({ queryKey: feedKeys.all }),
      client.invalidateQueries({ queryKey: profileKeys.postsAll() }),
      client.invalidateQueries({ queryKey: ['topics'] }),
      postId === undefined
        ? Promise.resolve()
        : client.invalidateQueries({ queryKey: postKeys.detail(postId) }),
    ])
  }
}

export function useCreatePostMutation() {
  const invalidate = useInvalidateContent()
  return useMutation({
    mutationFn: (payload: CreatePostPayload) => createPost(payload),
    onSuccess: async (created) => {
      await invalidate(created.id)
    },
  })
}

export function useUpdatePostMutation(id: number) {
  const invalidate = useInvalidateContent()
  return useMutation({
    mutationFn: (payload: UpdatePostPayload) => updatePost(id, payload),
    onSuccess: async (updated) => {
      await invalidate(updated.id)
    },
  })
}

export function useDeletePostMutation() {
  const invalidate = useInvalidateContent()
  return useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: async () => {
      await invalidate()
    },
  })
}

/**
 * 图片增删的失效范围与帖子写入相同：卡片封面读的是列表接口，
 * 只失效详情会让信息流停在旧封面上。
 */
export function useUploadPostImageMutation(postId: number) {
  const invalidate = useInvalidateContent()
  return useMutation({
    mutationFn: (file: File) => uploadPostImage(postId, file),
    onSuccess: async () => {
      await invalidate(postId)
    },
  })
}

export function useDeletePostImageMutation(postId: number) {
  const invalidate = useInvalidateContent()
  return useMutation({
    mutationFn: (imageId: number) => deletePostImage(postId, imageId),
    onSuccess: async () => {
      await invalidate(postId)
    },
  })
}
