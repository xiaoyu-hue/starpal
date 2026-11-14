// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState } from '../../../components/feedback/States'
import { ApiError } from '../../../lib/api-client'
import { useAuth } from '../../auth'
import { PostComposer } from '../components/PostComposer'
import { messageOf } from '../errors'
import type { CreatePostPayload } from '../api'
import {
  useDeletePostImageMutation,
  usePostDetailQuery,
  useUpdatePostMutation,
  useUploadPostImageMutation,
} from '../queries'

/** 编辑页：仅作者与管理员可达（前端只做入口控制，服务端仍独立校验）。 */
export function EditPostPage() {
  const { id: rawId = '' } = useParams<{ id: string }>()
  const id = Number(rawId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const query = usePostDetailQuery(id)
  const mutation = useUpdatePostMutation(id)
  const uploadMutation = useUploadPostImageMutation(id)
  const deleteImageMutation = useDeletePostImageMutation(id)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  if (!Number.isInteger(id) || id < 1) {
    return (
      <EmptyState
        title="帖子不存在"
        description="地址中的编号无效，可能已被删除。"
        actionLabel="返回首页"
        onAction={() => navigate('/')}
      />
    )
  }

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-3" role="status" aria-live="polite">
        <div className="sp-skeleton h-8 w-40 rounded-md" />
        <div className="sp-skeleton h-64 w-full rounded-md" />
      </div>
    )
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.code === 'NOT_FOUND'
    return notFound ? (
      <EmptyState
        title="帖子不存在"
        description="该内容不存在，或你没有查看权限。"
        actionLabel="返回首页"
        onAction={() => navigate('/')}
      />
    ) : (
      <ErrorState title="内容加载失败" onRetry={() => void query.refetch()} />
    )
  }

  const post = query.data
  const canEdit = post.isAuthor || user?.role === 'admin'

  if (!canEdit) {
    return (
      <EmptyState
        title="无法编辑这篇内容"
        description="只有作者本人或管理员可以修改他人发布的内容。"
        actionLabel="查看原帖"
        onAction={() => navigate(`/posts/${id}`)}
      />
    )
  }

  function handleSubmit(payload: CreatePostPayload) {
    setError(null)
    mutation.mutate(payload, {
      onSuccess: () => navigate(`/posts/${id}`, { replace: true }),
      onError: (cause) => setError(messageOf(cause, '保存失败，请稍后重试。')),
    })
  }

  /**
   * 编辑态的图片即时生效：帖子已存在，没有「等保存」的必要。
   * 逐张串行上传，失败一张不影响其余，最后把失败原因集中报出来。
   */
  async function handleAddImages(files: File[]) {
    setImageError(null)
    setUploading(true)
    const problems: string[] = []
    for (const file of files) {
      try {
        await uploadMutation.mutateAsync(file)
      } catch (cause) {
        problems.push(messageOf(cause, `${file.name} 上传失败`))
      }
    }
    setUploading(false)
    if (problems.length > 0) setImageError(problems.slice(0, 2).join('；'))
  }

  function handleRemoveImage(imageId: number) {
    setImageError(null)
    deleteImageMutation.mutate(imageId, {
      onError: (cause) => setImageError(messageOf(cause, '移除失败，请稍后重试。')),
    })
  }

  return (
    <section aria-labelledby="edit-heading" className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 id="edit-heading" className="text-xl font-semibold text-ink">
          编辑内容
        </h1>
        <p className="mt-1 text-sm text-muted">修改会立即生效，发布时间保持不变。</p>
      </div>

      <PostComposer
        mode="edit"
        initial={{ title: post.title, body: post.body, topicId: post.topicId }}
        submitting={mutation.isPending}
        serverError={error}
        onSubmit={handleSubmit}
        cancelTo={`/posts/${id}`}
        images={post.images}
        imagesBusy={uploading || deleteImageMutation.isPending}
        imageError={imageError}
        onAddImages={(files) => void handleAddImages(files)}
        onRemoveImage={handleRemoveImage}
      />
    </section>
  )
}
