import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState } from '../../../components/feedback/States'
import { ApiError } from '../../../lib/api-client'
import { useAuth } from '../../auth'
import { PostComposer } from '../components/PostComposer'
import { messageOf } from '../errors'
import type { CreatePostPayload } from '../api'
import { usePostDetailQuery, useUpdatePostMutation } from '../queries'

/** 编辑页：仅作者与管理员可达（前端只做入口控制，服务端仍独立校验）。 */
export function EditPostPage() {
  const { id: rawId = '' } = useParams<{ id: string }>()
  const id = Number(rawId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const query = usePostDetailQuery(id)
  const mutation = useUpdatePostMutation(id)
  const [error, setError] = useState<string | null>(null)

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
      />
    </section>
  )
}
