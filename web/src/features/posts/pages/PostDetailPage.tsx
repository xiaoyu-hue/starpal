import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, X } from 'lucide-react'
import { Avatar, Badge, Card } from '../../../components/ui/Primitives'
import { EmptyState, ErrorState } from '../../../components/feedback/States'
import { ApiError } from '../../../lib/api-client'
import type { PostStatus } from '../../../types/api'
import { CommentSection } from '../components/CommentSection'
import { PostActions } from '../components/PostActions'
import { PostInteractions } from '../components/PostInteractions'
import { PostImages } from '../../../components/content/PostImages'
import { RelatedPosts } from '../components/RelatedPosts'
import { usePostDetailQuery } from '../queries'

const STATUS_LABEL: Record<PostStatus, string> = {
  published: '已发布',
  draft: '草稿 · 仅自己可见',
  removed: '已被管理员移除',
  deleted: '已删除',
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

/** 帖子详情页：完整正文 + 作者与时间 + 作者操作 + 评论区 + 同话题内容。 */
export function PostDetailPage() {
  const { id: rawId = '' } = useParams<{ id: string }>()
  const id = Number(rawId)
  const navigate = useNavigate()
  const location = useLocation()
  const query = usePostDetailQuery(id)
  const [dismissed, setDismissed] = useState(false)

  // 发布页传图失败时会带 state 跳过来：帖子已建成，只有图片没传完，必须说清楚。
  const failures = (location.state as { imageFailures?: number } | null)?.imageFailures ?? 0
  const showFailure = failures > 0 && !dismissed

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
        <div className="sp-skeleton h-6 w-24 rounded-sm" />
        <div className="sp-skeleton h-72 w-full rounded-md" />
      </div>
    )
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.code === 'NOT_FOUND'
    return notFound ? (
      <EmptyState
        title="帖子不存在"
        description="该内容可能已被删除，或你没有查看权限。"
        actionLabel="返回首页"
        onAction={() => navigate('/')}
      />
    ) : (
      <ErrorState title="内容加载失败" onRetry={() => void query.refetch()} />
    )
  }

  const post = query.data

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/"
        className="sp-transition inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> 返回信息流
      </Link>

      {showFailure && (
        <div
          className="flex items-start gap-3 rounded-md border border-[var(--sp-danger)] bg-[var(--sp-danger-soft)] px-3 py-2.5 text-sm"
          role="status"
        >
          <p className="flex-1 text-ink">
            内容已发布，但有 <strong>{failures}</strong> 张图片没传成功。
            <Link to={`/posts/${post.id}/edit`} className="ml-1 text-accent underline">
              去编辑页补传
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="关闭提示"
            className="sp-transition text-muted hover:text-ink"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      <article aria-labelledby="post-heading">
        <Card className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link to={`/topics/${post.topic.slug}`}>
              <Badge variant="topic">{post.topic.nameZh}</Badge>
            </Link>
            {post.status !== 'published' && (
              <Badge variant="neutral">{STATUS_LABEL[post.status]}</Badge>
            )}
          </div>

          <h1 id="post-heading" className="text-2xl font-semibold leading-snug text-ink">
            {post.title}
          </h1>

          <div className="mt-4 flex items-center gap-2.5 border-b border-line pb-4">
            <Avatar name={post.author.displayName} src={post.author.avatarUrl} size={38} />
            <div className="min-w-0 flex-1">
              <Link
                to={`/u/${post.author.username}`}
                className="sp-transition block truncate text-sm font-medium text-ink hover:text-accent"
              >
                {post.author.displayName}
              </Link>
              <p className="text-xs text-faint">
                发布于 {formatTime(post.createdAt)}
                {post.updatedAt !== post.createdAt && ` · 编辑于 ${formatTime(post.updatedAt)}`}
              </p>
            </div>
          </div>

          <div className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-ink">
            {post.body}
          </div>

          <PostImages images={post.images} title={post.title} />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <PostInteractions post={post} />
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <MessageCircle size={15} aria-hidden="true" /> {post.commentCount} 评论
              </span>
            </div>
            <PostActions post={post} />
          </div>
        </Card>
      </article>

      <CommentSection postId={post.id} commentCount={post.commentCount} />

      <RelatedPosts postId={post.id} />
    </div>
  )
}
