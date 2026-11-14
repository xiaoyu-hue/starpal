import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PostComposer } from '../components/PostComposer'
import { messageOf } from '../errors'
import type { CreatePostPayload } from '../api'
import { useCreatePostMutation } from '../queries'

/** 发布页：成功后跳详情，保证用户立刻看到结果，而不是停在空表单上猜是否成功。 */
export function ComposePage() {
  const navigate = useNavigate()
  const mutation = useCreatePostMutation()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(payload: CreatePostPayload) {
    setError(null)
    mutation.mutate(payload, {
      onSuccess: (post) => {
        navigate(`/posts/${post.id}`, { replace: true })
      },
      onError: (cause) => {
        setError(messageOf(cause, '发布失败，请稍后重试。'))
      },
    })
  }

  return (
    <section aria-labelledby="compose-heading" className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 id="compose-heading" className="text-xl font-semibold text-ink">
          发布内容
        </h1>
        <p className="mt-1 text-sm text-muted">
          选一个话题，把想说的写清楚。发布后所有人都能看到。
        </p>
      </div>

      <PostComposer
        mode="create"
        submitting={mutation.isPending}
        serverError={error}
        onSubmit={handleSubmit}
        cancelTo="/"
      />
    </section>
  )
}
