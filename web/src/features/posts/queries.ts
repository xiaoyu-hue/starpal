// SPDX-License-Identifier: AGPL-3.0-or-later
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { feedKeys, postKeys } from '../../lib/query-keys'
import type { PostDetail } from '../../types/api'
import { profileKeys } from '../profile'
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  deletePostImage,
  fetchComments,
  fetchPostDetail,
  fetchRelatedPosts,
  setPostLike,
  updatePost,
  uploadPostImage,
  type CreatePostPayload,
  type UpdatePostPayload,
} from './api'

/** 缓存键定义在 lib/query-keys；此处重新导出，保持 posts 公共出口路径不变。 */
export { postKeys }

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

/**
 * 点赞：乐观更新详情缓存，失败回滚，成功以服务端返回的计数为准。
 *
 * 为什么用服务端计数而不是本地累加：并发下别人也在点赞，本地 +1 只是猜测。
 * 乐观更新只为让按钮立刻有反馈；服务端返回后立即校正，避免「显示 13 实际 12」。
 * 收藏开关集中到 features/bookmarks（卡片与详情页共用一份实现），此处只保留点赞。
 */
export function useLikeMutation(id: number) {
  const client = useQueryClient()
  const key = postKeys.detail(id)
  return useMutation({
    mutationFn: (on: boolean) => setPostLike(id, on),
    onMutate: async (on: boolean) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<PostDetail>(key)
      if (previous) {
        client.setQueryData<PostDetail>(key, {
          ...previous,
          isLiked: on,
          likeCount: Math.max(previous.likeCount + (on ? 1 : -1), 0),
        })
      }
      return { previous }
    },
    onError: (_error, _on, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
    },
    onSuccess: (state) => {
      client.setQueryData<PostDetail>(key, (prev) =>
        prev ? { ...prev, isLiked: state.liked, likeCount: state.likeCount } : prev,
      )
    },
    onSettled: async () => {
      // 列表里的计数与热门排序都会变；只标记过期，返回列表时再取，不在详情页强行重排。
      await client.invalidateQueries({ queryKey: feedKeys.all })
    },
  })
}

/**
 * 评论沿用与信息流一致的游标链：每页独立缓存，翻页只追加不重排。
 * 倒序排列（最新在上）由服务端保证，前端不再本地排序——本地排序会在
 * 新评论插入后把用户正在阅读的位置挤走。
 */
export function useCommentsQuery(postId: number) {
  return useInfiniteQuery({
    queryKey: postKeys.comments(postId),
    queryFn: ({ pageParam, signal }) => fetchComments(postId, pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: Number.isInteger(postId) && postId > 0,
  })
}

/**
 * 发表 / 删除后必须同时失效三处：评论链本身、帖子详情（`commentCount` 变了）、
 * 信息流（卡片上的评论数）。只失效评论链会让详情页数字停在旧值。
 */
export function useCommentMutation(postId: number) {
  const client = useQueryClient()
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: postKeys.comments(postId) }),
      client.invalidateQueries({ queryKey: postKeys.detail(postId) }),
      client.invalidateQueries({ queryKey: feedKeys.all }),
    ])
  }

  const create = useMutation({
    mutationFn: (body: string) => createComment(postId, body),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: invalidate,
  })
  return { create, remove }
}
