// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Heart } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useAuth } from '../../auth'
import type { PostDetail } from '../../../types/api'
import { messageOf } from '../errors'
import { useBookmarkMutation, useLikeMutation } from '../queries'

/**
 * 点赞与收藏。
 *
 * 互动态（是否已赞 / 已藏）由服务端按当前读者下发，前端不自行推断——
 * 匿名读者的 `isLiked` 恒为 false，登录后才可能是 true。
 * 点击后先乐观翻转，请求返回以服务端计数校正，失败回滚并提示。
 */

const BASE =
  'sp-transition inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border px-3 text-sm font-medium disabled:cursor-wait disabled:opacity-70'
const IDLE = 'border-line bg-surface text-muted hover:bg-subtle hover:text-ink'
const ACTIVE = 'border-[var(--sp-accent)] bg-[var(--sp-accent-soft)] text-accent'

export function PostInteractions({ post }: { post: PostDetail }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const like = useLikeMutation(post.id)
  const bookmark = useBookmarkMutation(post.id)
  const [error, setError] = useState<string | null>(null)

  function requireLogin(): boolean {
    if (user) return true
    navigate('/login')
    return false
  }

  function toggleLike() {
    if (!requireLogin()) return
    setError(null)
    like.mutate(!post.isLiked, {
      onError: (cause) => setError(messageOf(cause, '操作失败，请稍后重试。')),
    })
  }

  function toggleBookmark() {
    if (!requireLogin()) return
    setError(null)
    bookmark.mutate(!post.isBookmarked, {
      onError: (cause) => setError(messageOf(cause, '操作失败，请稍后重试。')),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="互动">
      <button
        type="button"
        onClick={toggleLike}
        disabled={like.isPending}
        aria-pressed={post.isLiked}
        aria-label={post.isLiked ? '取消点赞' : '点赞'}
        className={cn(BASE, post.isLiked ? ACTIVE : IDLE)}
      >
        <Heart size={15} aria-hidden="true" className={post.isLiked ? 'fill-current' : undefined} />
        <span>{post.likeCount}</span>
        <span className="sr-only">点赞</span>
      </button>

      <button
        type="button"
        onClick={toggleBookmark}
        disabled={bookmark.isPending}
        aria-pressed={post.isBookmarked}
        aria-label={post.isBookmarked ? '取消收藏' : '收藏'}
        className={cn(BASE, post.isBookmarked ? ACTIVE : IDLE)}
      >
        <Bookmark
          size={15}
          aria-hidden="true"
          className={post.isBookmarked ? 'fill-current' : undefined}
        />
        <span>{post.bookmarkCount}</span>
        <span className="sr-only">收藏</span>
      </button>

      {error ? (
        <p className="w-full text-xs text-[var(--sp-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
