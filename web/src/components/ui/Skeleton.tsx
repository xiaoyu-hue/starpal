// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('sp-skeleton', className)} aria-hidden="true" />
}

/** 帖子卡片加载态，用于信息流骨架屏。 */
export function PostCardSkeleton() {
  return (
    <div className="sp-card space-y-3 p-5" role="status" aria-label="内容加载中">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  )
}
