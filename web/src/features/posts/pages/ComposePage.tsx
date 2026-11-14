import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PostComposer } from '../components/PostComposer'
import { messageOf } from '../errors'
import { createPost, uploadPostImage, type CreatePostPayload } from '../api'
import { useInvalidateContent } from '../queries'

/**
 * 发布页：先建帖、再传图。
 *
 * 顺序由服务端契约决定——图片挂在帖子下（`POST /api/posts/:id/images`），
 * 没有帖子就没有可挂的地址。所以图片在浏览器里排队，帖子创建成功后才逐张上传。
 * 传图失败不回滚帖子：内容已经写完了，为一张图把正文丢掉是最差的选择；
 * 改为跳到详情页并提示失败张数，用户可在编辑页补传。
 */
export function ComposePage() {
  const navigate = useNavigate()
  const invalidate = useInvalidateContent()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  async function handleSubmit(payload: CreatePostPayload, files: File[]) {
    setError(null)
    setBusy(true)
    try {
      const post = await createPost(payload)

      let failed = 0
      for (let index = 0; index < files.length; index += 1) {
        setProgress({ done: index, total: files.length })
        try {
          await uploadPostImage(post.id, files[index])
        } catch {
          failed += 1
        }
      }
      setProgress(null)
      await invalidate(post.id)

      navigate(`/posts/${post.id}`, {
        replace: true,
        state: failed > 0 ? { imageFailures: failed } : undefined,
      })
    } catch (cause) {
      setError(messageOf(cause, '发布失败，请稍后重试。'))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const label = progress
    ? `上传图片 ${Math.min(progress.done + 1, progress.total)}/${progress.total}…`
    : undefined

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
        submitting={busy}
        submittingLabel={label}
        serverError={error}
        onSubmit={(payload, files) => void handleSubmit(payload, files)}
        cancelTo="/"
      />
    </section>
  )
}
