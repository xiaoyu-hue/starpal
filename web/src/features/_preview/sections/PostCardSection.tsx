// SPDX-License-Identifier: AGPL-3.0-or-later
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react'
import { Avatar, Badge, Card } from '../../../components/ui/Primitives'
import { SAMPLE_POST } from '../preview-data'

export function PostCardSection() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
      <Card className="sp-hover">
        <div className="flex items-center gap-3">
          <Avatar name="示" size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">
              {SAMPLE_POST.author}
              <Badge className="ml-2">示例</Badge>
            </p>
            <p className="mt-0.5 text-xs text-faint">{SAMPLE_POST.time}</p>
          </div>
          <Badge variant="topic">{SAMPLE_POST.topic}</Badge>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-ink">{SAMPLE_POST.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{SAMPLE_POST.excerpt}</p>

        <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-line pt-4 text-xs text-faint">
          <span className="inline-flex items-center gap-1.5">
            <Heart size={15} />
            {SAMPLE_POST.likes}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle size={15} />
            {SAMPLE_POST.comments}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bookmark size={15} />
            收藏
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Share2 size={15} />
            分享
          </span>
        </div>
      </Card>

      <div className="space-y-3">
        <p className="text-xs text-faint">右栏面板（实色卡片）</p>
        <Card className="p-4">
          <p className="text-sm font-medium text-ink">热门话题</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            无真实数据时显示空态，不以演示内容冒充社区热度。
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-ink">社区公告</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">由管理端配置后展示。</p>
        </Card>
      </div>

      <p className="text-xs text-faint lg:col-span-2">
        底部计数与操作为静态排版示意，不渲染可点击的假按钮；真实交互在 M4/M5 接入服务端数据。
      </p>
    </div>
  )
}
