// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Award } from 'lucide-react'
import { buttonClass } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/feedback/States'
import { ApiError } from '../../lib/api-client'
import { useAuth } from '../auth'
import { AchievementTimeline } from './AchievementTimeline'
import { useTimelineQuery } from './achievements.queries'

/**
 * 成就页。
 *
 * 看谁由 `?u=用户名` 决定，缺省看自己——不为「他人成就」单独开一条动态路由，
 * 页面结构只有一份，链接可分享、前进后退可回到同一视图。
 * 未登录且没带 `?u=` 时不猜身份：只展示本周热门，并给出登录入口。
 */
export function AchievementsPage() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const target = (params.get('u') ?? '').trim() || (user?.username ?? '')
  const isSelf = Boolean(user) && target === user!.username
  const query = useTimelineQuery(target)

  if (target === '') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-ink">成就</h1>
          <p className="mt-1 text-sm text-muted">
            成就是长期行为的记录，解锁后一直保留。登录后可以看到自己的进度。
          </p>
        </header>
        <div className="sp-card flex flex-col items-center px-6 py-10 text-center">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: 'var(--sp-achievement-soft)', color: 'var(--sp-achievement)' }}
          >
            <Award size={22} aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-ink">登录后查看你的成就</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            也可以从任何人的主页点进「成就」，看他解锁了什么。
          </p>
          <Link to="/login" className={`mt-5 ${buttonClass('primary', 'md')}`}>
            去登录
          </Link>
        </div>
      </div>
    )
  }

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-3" role="status" aria-live="polite">
        <div className="sp-skeleton h-8 w-32 rounded-md" />
        <div className="sp-skeleton h-24 w-full rounded-md" />
        <div className="sp-skeleton h-24 w-full rounded-md" />
      </div>
    )
  }

  if (query.isError) {
    const error = query.error
    if (error instanceof ApiError && error.code === 'NOT_FOUND') {
      return (
        <EmptyState
          title="用户不存在"
          description="该用户名对应的账户不存在，或已被停用。"
          actionLabel="返回首页"
          onAction={() => navigate('/')}
        />
      )
    }
    return <ErrorState title="成就加载失败" onRetry={() => void query.refetch()} />
  }

  const timeline = query.data

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h1 className="text-xl font-semibold text-ink">
            {isSelf ? '我的成就' : `${timeline.displayName} 的成就`}
          </h1>
          <span className="text-sm text-muted">
            {timeline.unlockedCount} / {timeline.totalCount}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          解锁记录在读到时判定并保存，页面显示的是判定通过的日期。
          {!isSelf && (
            <>
              {' '}
              <Link to={`/u/${encodeURIComponent(timeline.username)}`} className="text-accent">
                返回主页
              </Link>
            </>
          )}
        </p>
      </header>

      <AchievementTimeline timeline={timeline} />
    </div>
  )
}
