import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Primitives'
import { StaticPage, StatusLine } from './StaticPage'
import { useAnnouncementsQuery } from './meta.queries'

/** 把 ISO 日期（2026-11-14）转成中文短日期；非法值原样返回，不因数据格式问题让整页崩掉。 */
function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const [, year, month, day] = match
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`
}

/** 社区公告页：消费 /api/meta/announcements，与右栏卡片共用同一份常量。 */
export function AnnouncementsPage() {
  const { data, isLoading, isError } = useAnnouncementsQuery()
  return (
    <StaticPage title="社区公告">
      {isLoading && <StatusLine text="加载中…" />}
      {isError && <StatusLine text="加载失败，请刷新重试。" tone="danger" />}
      {data && (
        <>
          {data.items.length === 0 ? (
            <Card className="p-5">
              <p className="text-sm leading-relaxed text-muted">暂无公告。</p>
            </Card>
          ) : (
            data.items.map((item) => (
              <Card key={`${item.date}-${item.title}`} className="space-y-2 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink">{item.title}</h2>
                  <time dateTime={item.date} className="text-xs text-faint">
                    {formatDate(item.date)}
                  </time>
                </div>
                <p className="text-sm leading-relaxed text-muted">{item.body}</p>
              </Card>
            ))
          )}
          <Card className="flex flex-wrap items-center justify-between gap-2 p-4">
            <span className="text-xs text-faint">公告随版本发布，旧公告保留在列表中</span>
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
