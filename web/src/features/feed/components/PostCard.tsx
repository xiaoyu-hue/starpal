import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react'
import { Avatar, Badge, Card } from '../../../components/ui/Primitives'
import type { FeedPost } from '../../../types/api'

function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

/** 帖子卡片：字段来自服务端数据；计数为真实值，未接入的操作不渲染为可点击控件。 */
export function PostCard({
  post,
  position,
  total,
}: {
  post: FeedPost
  position: number
  total: number
}) {
  return (
    <Card
      role="article"
      aria-posinset={position}
      aria-setsize={total}
      aria-labelledby={`post-title-${post.id}`}
      tabIndex={0}
      className="sp-transition p-5"
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={post.author.username} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{post.author.username}</p>
          <p className="text-xs text-faint">{formatTime(post.createdAt)}</p>
        </div>
        <Badge variant="topic">{post.topic.nameZh}</Badge>
      </div>

      <h2 id={`post-title-${post.id}`} className="mt-3 text-lg font-semibold text-ink">
        {post.title}
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
