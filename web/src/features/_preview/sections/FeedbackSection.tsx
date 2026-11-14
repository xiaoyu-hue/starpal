// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { EmptyState, ErrorState } from '../../../components/feedback/States'
import { PostCardSkeleton } from '../../../components/ui/Skeleton'

export function FeedbackSection() {
  const [note, setNote] = useState('')

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div>
        <p className="mb-3 text-xs font-medium text-faint">加载态</p>
        <PostCardSkeleton />
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-faint">空态</p>
        <EmptyState onAction={() => setNote('已触发「写下第一篇」入口（预览态，无真实跳转）')} />
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-faint">错误态</p>
        <ErrorState onRetry={() => setNote('已触发重新加载（预览态，无真实请求）')} />
      </div>
      <p className="text-xs text-accent lg:col-span-3" role="status">
        {note || '点击上方按钮可检验交互反馈。三种状态均可独立复现。'}
      </p>
    </div>
  )
}
