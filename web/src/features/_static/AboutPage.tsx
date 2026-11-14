import { Card } from '../../components/ui/Primitives'
import { StaticPage, StatusLine } from './StaticPage'
import { useAboutQuery } from './meta.queries'

/** 关于页：消费 /api/meta/about，版本号与建站日期读自后端，避免前后端各写一份。 */
export function AboutPage() {
  const { data, isLoading, isError } = useAboutQuery()
  return (
    <StaticPage title="关于">
      {isLoading && <StatusLine text="加载中…" />}
      {isError && <StatusLine text="加载失败，请刷新重试。" tone="danger" />}
      {data && (
        <Card className="space-y-3 p-6">
          <h2 className="text-base font-semibold text-ink">{data.siteName}</h2>
          <p className="text-sm text-muted">当前版本 {data.version}</p>
          <p className="text-sm text-muted">建站于 {data.launchDate}</p>
          <p role="status" className="text-xs text-faint">
            当前已是最新版本（{data.version}），暂无更新通道。
          </p>
        </Card>
      )}
    </StaticPage>
  )
}
