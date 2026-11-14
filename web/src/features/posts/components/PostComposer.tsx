import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  POST_BODY_MAX,
  POST_IMAGES_MAX,
  POST_TITLE_MAX,
} from '../../../config/content-constants'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Primitives'
import { useTopicsQuery } from '../../topics'
import type { PostImage } from '../../../types/api'
import type { CreatePostPayload } from '../api'
import { ImagePicker } from './ImagePicker'
import { TopicPicker } from './TopicPicker'

type FormErrors = {
  title?: string
  body?: string
  topic?: string
}

type PostComposerProps = {
  mode: 'create' | 'edit'
  initial?: { title: string; body: string; topicId: number }
  submitting: boolean
  /** 覆盖提交按钮文案（上传图片时用来显示进度）。 */
  submittingLabel?: string
  serverError: string | null
  /** 创建模式把待上传文件一并交出；编辑模式的图片由父级即时处理，此处恒为空数组。 */
  onSubmit: (payload: CreatePostPayload, files: File[]) => void
  cancelTo: string
  /** 已入库图片，仅编辑模式有值。 */
  images?: PostImage[]
  imagesBusy?: boolean
  imageError?: string | null
  onAddImages?: (files: File[]) => void
  onRemoveImage?: (imageId: number) => void
}

/** 与服务端一致的准入规则：标题 1..180、正文 1..20000、必须选话题。 */
function validate(title: string, body: string, topicId: number | null): FormErrors {
  const errors: FormErrors = {}
  if (title.trim().length === 0) errors.title = '请填写标题'
  else if (title.length > POST_TITLE_MAX) errors.title = `标题不超过 ${POST_TITLE_MAX} 字`
  if (body.trim().length === 0) errors.body = '请填写正文'
  else if (body.length > POST_BODY_MAX) errors.body = `正文不超过 ${POST_BODY_MAX} 字`
  if (topicId === null) errors.topic = '请选择话题'
  return errors
}

/**
 * 发帖 / 编辑共用表单：两种模式只在初始值、按钮文案与提交目标上不同。
 * 首次提交后才展示校验错误，避免用户刚进页面就被满屏红字迎接。
 *
 * 图片的归属两种模式不同：新建时帖子还没有 id，图片只能先在浏览器里排队，
 * 等帖子创建成功再逐张上传；编辑时帖子已存在，选中即上传，改动立刻生效。
 */
export function PostComposer({
  mode,
  initial,
  submitting,
  submittingLabel,
  serverError,
  onSubmit,
  cancelTo,
  images = [],
  imagesBusy = false,
  imageError = null,
  onAddImages,
  onRemoveImage,
}: PostComposerProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [topicId, setTopicId] = useState<number | null>(initial?.topicId ?? null)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState<File[]>([])

  const topicsQuery = useTopicsQuery()
  const errors = submitted ? validate(title, body, topicId) : {}

  function handlePick(files: File[]) {
    if (mode === 'edit') onAddImages?.(files)
    else setPending((current) => [...current, ...files])
  }

  function handleRemovePending(index: number) {
    setPending((current) => current.filter((_, i) => i !== index))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (topicId === null) return
    if (Object.keys(validate(title, body, topicId)).length > 0) return
    onSubmit({ title: title.trim(), body: body.trim(), topicId }, pending)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Card className="space-y-5 p-6">
        <div>
          <label htmlFor="post-title" className="mb-1.5 block text-sm font-medium text-ink">
            标题
          </label>
          <input
            id="post-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={POST_TITLE_MAX}
            placeholder="用一句话说清你想讨论什么"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? 'post-title-error' : 'post-title-hint'}
            className="sp-transition h-11 w-full rounded-md border border-line bg-surface px-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--sp-accent-soft)]"
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            {errors.title ? (
              <p id="post-title-error" className="text-xs text-[var(--sp-danger)]" role="alert">
                {errors.title}
              </p>
            ) : (
              <p id="post-title-hint" className="text-xs text-faint">
                标题会出现在信息流卡片上。
              </p>
            )}
            <span className="shrink-0 text-xs text-faint">
              {title.length}/{POST_TITLE_MAX}
            </span>
          </div>
        </div>

        <div>
          {topicsQuery.isPending ? (
            <div className="space-y-2">
              <div className="sp-skeleton h-4 w-20 rounded-sm" />
              <div className="sp-skeleton h-10 w-full rounded-md" />
            </div>
          ) : topicsQuery.isError ? (
            <p className="text-sm text-[var(--sp-danger)]" role="alert">
              话题列表加载失败，请刷新页面后重试。
            </p>
          ) : (
            <TopicPicker
              topics={topicsQuery.data}
              value={topicId}
              onChange={setTopicId}
              error={errors.topic}
            />
          )}
        </div>

        <div>
          <label htmlFor="post-body" className="mb-1.5 block text-sm font-medium text-ink">
            正文
          </label>
          <textarea
            id="post-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={POST_BODY_MAX}
            rows={12}
            placeholder="把想说的写完整：背景、你的观察、想听到的回应。"
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={errors.body ? 'post-body-error' : 'post-body-hint'}
            className="sp-transition w-full resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--sp-accent-soft)]"
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            {errors.body ? (
              <p id="post-body-error" className="text-xs text-[var(--sp-danger)]" role="alert">
                {errors.body}
              </p>
            ) : (
              <p id="post-body-hint" className="text-xs text-faint">
                支持换行。图片会被压缩并抹除拍摄信息（含位置）。
              </p>
            )}
            <span className="shrink-0 text-xs text-faint">
              {body.length}/{POST_BODY_MAX}
            </span>
          </div>
        </div>

        <ImagePicker
          existing={images}
          pending={pending}
          max={POST_IMAGES_MAX}
          busy={submitting || imagesBusy}
          error={imageError}
          onPick={handlePick}
          onRemoveExisting={(imageId) => onRemoveImage?.(imageId)}
          onRemovePending={handleRemovePending}
        />

        {mode === 'edit' && (
          <p className="text-xs text-faint">图片改动即时生效，无需点「保存修改」。</p>
        )}

        {serverError ? (
          <p className="rounded-md border border-[var(--sp-danger)] bg-[var(--sp-danger-soft)] px-3 py-2 text-sm text-[var(--sp-danger)]" role="alert">
            {serverError}
          </p>
        ) : null}
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link
          to={cancelTo}
          className="sp-transition inline-flex h-10 items-center rounded-md border border-line px-4 text-sm text-muted hover:bg-subtle hover:text-ink"
        >
          取消
        </Link>
        <Button type="submit" loading={submitting}>
          {submittingLabel ?? (mode === 'create' ? '发布' : '保存修改')}
        </Button>
      </div>
    </form>
  )
}
