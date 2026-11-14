import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Primitives'
import { DocHeader, Section, StaticPage, StatusLine } from './StaticPage'
import { useGuidelinesQuery } from './meta.queries'

/** 社区准则页：消费 /api/meta/guidelines，保证与后端准则常量一致。 */
export function GuidelinesPage() {
  const { data, isLoading, isError } = useGuidelinesQuery()
  return (
    <StaticPage title="社区准则">
      {isLoading && <StatusLine text="加载中…" />}
      {isError && <StatusLine text="加载失败，请刷新重试。" tone="danger" />}
      {data && (
        <>
          <DocHeader
            summary={data.summary}
            version={data.version}
            updatedAt={data.updatedAt}
            effectiveAt={data.effectiveAt}
          />
          {data.sections.map((s) => (
            <Section key={s.heading} heading={s.heading} blocks={s.blocks} />
          ))}
          <Card className="flex items-center justify-between p-4">
            <span className="text-xs text-faint">
              版本 {data.version} · 生效 {data.effectiveAt}
            </span>
            <Link to="/privacy" className="text-sm text-accent hover:underline">
              隐私说明 →
            </Link>
          </Card>
        </>
      )}
    </StaticPage>
  )
}
