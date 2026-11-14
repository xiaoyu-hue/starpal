// SPDX-License-Identifier: AGPL-3.0-or-later
import { PostCardSkeleton } from '../../../components/ui/Skeleton'

/** 加载态骨架屏：复用基础组件，避免重复实现相同视觉。 */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label="正在加载信息流">
      {Array.from({ length: count }, (_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  )
}
