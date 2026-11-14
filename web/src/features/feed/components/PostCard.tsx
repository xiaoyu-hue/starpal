import type { KeyboardEvent, MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react'
import { Avatar, Badge, Card } from '../../../components/ui/Primitives'
import type { FeedPost } from '../../../types/api'

function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

type PostCardProps = {
  post: FeedPost
  position: number
  total: number
}

/**
 * 帖子卡片：整卡可进入详情，标题为语义主锚点。
 * 计数来自服务端真实值；尚未接入的操作（收藏 / 分享）以禁用态呈现，
 * 不做「点了没反应」的假按钮。
 */
export function PostCard({ post, position, total }: PostCardProps) {
  const navigate = useNavigate()
  const href = `/posts/${post.id}`

  // 卡内已有链接时不再重复导航，避免嵌套锚点与外部 onClick 相互抢事件。
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('a')) return
    navigate(href)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter') return
    // 焦点在内部链接时交给链接自己处理，避免一次按键跳两次。
    if ((event.target as HTMLElement).closest('a')) return
    event.preventDefault()
    navigate(href)
  }

  return (
    <Card
      role="article"
      aria-posinset={position}
      aria-setsize={total}
      aria-labelledby={`post-title-${post.id}`}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="sp-transition cursor-pointer p-5 hover:border-line-strong"
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={post.author.displayName} src={post.author.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <Link
            to={`/u/${post.author.username}`}
            className="sp-transition block truncate text-sm font-medium text-ink hover:text-accent"
          >
            {post.author.displayName}
          </Link>
          <p className="text-xs text-faint">{formatTime(post.createdAt)}</p>
        </div>
        <Badge variant="topic">{post.topic.nameZh}</Badge>
      </div>

      <h2 id={`post-title-${post.id}`} className="mt-3 text-lg font-semibold text-ink">
        <Link to={href} className="sp-transition hover:text-accent">
          {post.title}
        </Link>
      </h2>
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">{post.excerpt}</p>

      <div
        className="mt-4 flex items-center gap-5 border-t border-line pt-3 text-xs text-muted"
        aria-label="帖子统计"
      >
        <span className="inline-flex items-center gap-1.5">
          <Heart size={15} aria-hidden="true" /> {post.likeCount} 点赞
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle size={15} aria-hidden="true" /> {post.commentCount} 评论
        </span>
        <span className="inline-flex items-center gap-1.5" aria-disabled="true" title="收藏功能将在 M4 接入">
          <Bookmark size={15} aria-hidden="true" /> 收藏
        </span>
        <span className="inline-flex items-center gap-1.5" aria-disabled="true" title="分享功能将在后续里程碑接入">
          <Share2 size={15} aria-hidden="true" /> 分享
        </span>
      </div>
    </Card>
  )
}
