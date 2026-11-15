// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MessageSquare, Pencil, Users } from 'lucide-react'
import { Avatar, Badge, Card } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/feedback/States'
import { ApiError } from '../../lib/api-client'
import { mergeFeedPages } from '../../lib/pagination'
import { PostCard } from '../feed'
import { useAuth } from '../auth'
import { ProfileAchievements } from '../achievements'
import { ProfileLevel, ProfileRankBadge } from '../level'
import { TitleBadges } from '../users'
import { usePublicProfileQuery, useUserPostsQuery } from './queries'

/** 公开个人页：头像、显示名、用户名、简介、注册日期与帖子占位。 */
export function ProfilePage() {
  const { username = '' } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const profileQuery = usePublicProfileQuery(username)
  const postsQuery = useUserPostsQuery(username)

  const isSelf = Boolean(user) && user!.username === username
  const posts = mergeFeedPages(postsQuery.data?.pages ?? [])

  if (profileQuery.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-3" role="status" aria-live="polite">
        <div className="sp-skeleton h-40 w-full rounded-md" />
        <div className="sp-skeleton h-24 w-full rounded-md" />
      </div>
    )
  }

  if (profileQuery.isError) {
    const err = profileQuery.error
      if (err instanceof ApiError && err.code === 'NOT_FOUND') {
        return (
          <EmptyState
            title="用户不存在"
            description="该用户名对应的账户不存在，或已被停用。"
            actionLabel="返回首页"
            onAction={() => navigate('/')}
          />
        )
      }
    return (
      <ErrorState
        title="个人主页加载失败"
        onRetry={() => void profileQuery.refetch()}
      />
    )
  }

  const profile = profileQuery.data

  const joined = new Date(profile.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  })

  const optional = profile.optional
  const hasOptional = optional && (optional.zodiac || optional.mbti || optional.ageBand)

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-ink">
                {profile.displayName}
              </h1>
              <TitleBadges titles={profile.titles} />
              <ProfileRankBadge username={profile.username} />
              {isSelf && (
                <Link to="/settings" className={buttonClass('secondary', 'sm')}>
                  <Pencil size={14} /> 编辑资料
                </Link>
              )}
              {!isSelf && user && (
                <Link
                  to={`/messages?to=${encodeURIComponent(profile.username)}`}
                  className={buttonClass('secondary', 'sm')}
                >
                  <MessageSquare size={14} /> 发私信
                </Link>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">@{profile.username}</p>
            {profile.biography && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {profile.biography}
              </p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
              <Users size={13} /> 注册于 {joined}
            </p>
          </div>
        </div>

        {hasOptional && (
          <div className="mt-4 flex flex-wrap gap-2">
            {optional!.zodiac && <Badge variant="accent">{optional!.zodiac}</Badge>}
            {optional!.mbti && <Badge variant="topic">{optional!.mbti}</Badge>}
            {optional!.ageBand && <Badge variant="neutral">{optional!.ageBand}</Badge>}
          </div>
        )}
      </Card>

      <ProfileLevel username={profile.username} />

      <ProfileAchievements username={profile.username} isSelf={isSelf} />

      <section aria-labelledby="posts-heading">
        <h2 id="posts-heading" className="mb-3 text-sm font-medium text-muted">
          已发布内容
        </h2>
        {postsQuery.isPending ? (
          <div className="sp-skeleton h-24 w-full rounded-md" />
        ) : posts.length === 0 ? (
          <EmptyState
            title="这里还没有发布任何内容"
            description="当该成员发布内容后，会显示在这里。"
            actionLabel={isSelf ? '去发布' : '返回首页'}
            onAction={() => (isSelf ? navigate('/posts/new') : navigate('/'))}
          />
        ) : (
          <>
            <div className="space-y-3">
              {posts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  position={index + 1}
                  total={posts.length}
                />
              ))}
            </div>
            {postsQuery.hasNextPage && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => void postsQuery.fetchNextPage()}
                  disabled={postsQuery.isFetchingNextPage}
                  className={buttonClass('secondary', 'sm')}
                >
                  {postsQuery.isFetchingNextPage ? '加载中…' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-2 text-xs text-faint">
        <Link to="/about" className={buttonClass('ghost', 'sm')}>
          关于
        </Link>
        <Link to="/product" className={buttonClass('ghost', 'sm')}>
          产品声明
        </Link>
        <Link to="/guidelines" className={buttonClass('ghost', 'sm')}>
          社区准则
        </Link>
        <Link to="/privacy" className={buttonClass('ghost', 'sm')}>
          隐私说明
        </Link>
        <Link to="/disclaimer" className={buttonClass('ghost', 'sm')}>
          免责声明
        </Link>
      </div>
    </div>
  )
}
