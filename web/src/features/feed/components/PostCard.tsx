// SPDX-License-Identifier: AGPL-3.0-or-later
import { m } from 'motion/react'
import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react'
import { PostCover } from '../../../components/content/PostImages'
import { Avatar, Badge, Card } from '../../../components/ui/Primitives'
import { cn } from '../../../lib/cn'
import { waterDropPulse, waterDropSpring } from '../../../lib/motion'
import type { FeedPost } from '../../../types/api'
import { useAuth } from '../../auth'
import { TitleBadges } from '../../users'
import { useBookmarkMutation } from '../../bookmarks'

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
 * 收藏是可用的实时开关（与详情页共用同一 mutation）；分享尚未开放，仍以禁用态呈现，
 * 不做「点了没反应」的假按钮。
 */
export function PostCard({ post, position, total }: PostCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const bookmark = useBookmarkMutation(post.id)
  const [error, setError] = useState<string | null>(null)
  const href = `/posts/${post.id}`

  // 卡内已有链接或按钮时不再重复导航，避免嵌套交互与整卡 onClick 相互抢事件。
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('a, button')) return
    navigate(href)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter') return
    // 焦点在内部链接或按钮时交给它自己处理，避免一次按键跳两次。
    if ((event.target as HTMLElement).closest('a, button')) return
    event.preventDefault()
    navigate(href)
  }

  function toggleBookmark(event: MouseEvent<HTMLButtonElement>) {
    // 整卡可点进详情：按钮必须止住冒泡，否则一次点击会同时收藏并跳走。
    event.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    setError(null)
    bookmark.mutate(!post.isBookmarked, {
      onError: (cause) =>
        setError(cause instanceof Error ? cause.message : '操作失败，请稍后重试。'),
    })
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
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/u/${post.author.username}`}
              className="sp-transition block truncate text-sm font-medium text-ink hover:text-accent"
            >
              {post.author.displayName}
            </Link>
            <TitleBadges titles={post.author.titles} size="sm" />
          </div>
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

      {post.images.length > 0 && (
        <PostCover image={post.images[0]} title={post.title} />
      )}

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
        <m.button
          type="button"
          onClick={toggleBookmark}
          disabled={bookmark.isPending}
          aria-pressed={post.isBookmarked}
          aria-label={post.isBookmarked ? '取消收藏' : '收藏'}
          title={post.isBookmarked ? '取消收藏' : '收藏'}
          whileTap={{ scale: 0.88, transition: waterDropSpring }}
          className={cn(
            'sp-transition inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5',
            'hover:text-ink disabled:cursor-wait disabled:opacity-70',
            post.isBookmarked ? 'text-accent' : 'text-muted',
          )}
        >
          <m.span
            aria-hidden="true"
            animate={post.isBookmarked ? { scale: [...waterDropPulse] } : { scale: 1 }}
            transition={waterDropSpring}
            className="inline-flex"
          >
            <Bookmark size={15} className={post.isBookmarked ? 'fill-current' : undefined} />
          </m.span>
          {post.bookmarkCount} 收藏
        </m.button>
        <span className="inline-flex items-center gap-1.5" aria-disabled="true" title="分享功能尚未开放">
          <Share2 size={15} aria-hidden="true" /> 分享
        </span>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-[var(--sp-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  )
}
