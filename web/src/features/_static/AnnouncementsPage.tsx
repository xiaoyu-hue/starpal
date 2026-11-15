// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Primitives'
import { StaticPage, StatusLine } from './StaticPage'
import { useAnnouncementsQuery } from './meta.queries'
import { AnnouncementCard } from './AnnouncementCard'

/** 小节标题：档案段与通知段分开，避免「历史」与「现在」在同一串里混着读。 */
function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
    </div>
  )
}

/**
 * 社区公告页：消费 `/api/meta/announcements`，与右栏卡片读同一份数据。
 *
 * 三段式：置顶（当前状态、重要提醒）→ 运营通知（可编辑）→ 发布记录（历史档案）。
 * 「当前状态」之所以置顶，是因为用户最常问的是「现在能用什么」；
 * 「发布记录」标注为档案，让人知道这部分不会因为运营改动而变动。
 */
export function AnnouncementsPage() {
  const { data, isLoading, isError } = useAnnouncementsQuery()
  const empty = data && data.pinned.length + data.notices.length + data.history.length === 0

  return (
    <StaticPage title="社区公告">
      {isLoading && <StatusLine text="加载中…" />}
      {isError && <StatusLine text="加载失败，请刷新重试。" tone="danger" />}
      {empty && (
        <Card className="p-5">
          <p className="text-sm leading-relaxed text-muted">暂无公告。</p>
        </Card>
      )}
      {data && (
        <>
          {data.pinned.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}

          {data.notices.length > 0 && (
            <SectionHeading title="运营通知" hint="维护、规则提醒与临时说明，由运营者随时更新" />
          )}
          {data.notices.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}

          {data.history.length > 0 && (
            <SectionHeading
              title="发布记录"
              hint="功能上线的历史档案，按日期留存，不随运营改动"
            />
          )}
          {data.history.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}

          <Card className="flex flex-wrap items-center justify-between gap-2 p-4">
            <span className="text-xs text-faint">
              发布记录随版本发布；运营通知与当前状态由运营者在后台维护
            </span>
            <span className="flex items-center gap-3 text-sm">
              <Link to="/guidelines" className="text-accent hover:underline">
                社区准则
              </Link>
              <Link to="/privacy" className="text-accent hover:underline">
                隐私说明
              </Link>
            </span>
          </Card>
        </>
      )}
    </StaticPage>
  )
}
