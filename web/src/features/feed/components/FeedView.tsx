// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react'
import type { FeedPost } from '../../../types/api'
import { ApiError } from '../../../lib/api-client'
import { Card } from '../../../components/ui/Primitives'
import { ErrorState } from '../../../components/feedback/States'
import { FeedSkeleton } from './FeedSkeleton'
import { PostCard } from './PostCard'

/** 离线预览提示：不连后端时说明原因，而不是抛出网络错误吓用户。 */
function OfflineNotice() {
  return (
    <Card className="p-6 text-center">
      <h3 className="text-base font-semibold text-ink">离线预览模式</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
        当前为不连接后端的设计预览，不展示任何内容数据。运行应用后，信息流会从服务端读取真实数据；
        无内容时显示引导式空态。
      </p>
    </Card>
  )
}

type FeedViewProps = {
  items: FeedPost[]
  isPending: boolean
  error: unknown
  onRetry: () => void
  /** 空态内容由调用方决定：首页引导发帖，话题页建议换话题，个人页说明尚未发布。 */
  empty: ReactNode
}

/**
 * 信息流主体：待加载 / 失败 / 空 / 有内容四态的唯一实现。
 * 首页与话题页、个人页共用，避免同一套状态分支写三遍后逐渐走形。
 */
export function FeedView({ items, isPending, error, onRetry, empty }: FeedViewProps) {
  if (isPending) return <FeedSkeleton />

  if (error) {
    if (error instanceof ApiError && error.code === 'OFFLINE_PREVIEW') return <OfflineNotice />
    const message = error instanceof Error ? error.message : '请求未能完成，请稍后重试。'
    return <ErrorState description={message} onRetry={onRetry} />
  }

  if (items.length === 0) return <>{empty}</>

  return (
    <div className="space-y-3">
      {items.map((post, index) => (
        <PostCard key={post.id} post={post} position={index + 1} total={items.length} />
      ))}
    </div>
  )
}
