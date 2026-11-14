import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Primitives'
import { DocHeader, Section, StaticPage, StatusLine } from './StaticPage'
import { useProductQuery } from './meta.queries'

/** 产品声明页：说明定位、开放范围与合规状态，避免被当成商业平台。 */
export function ProductPage() {
  const { data, isLoading, isError } = useProductQuery()
  return (
    <StaticPage title="产品声明">
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
          <Card className="space-y-2 p-4">
            <p className="text-xs text-faint">
              {data.siteName} · 版本 {data.version} · 生效 {data.effectiveAt}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link to="/about" className="text-sm text-accent hover:underline">
                关于星聚 →
              </Link>
              <Link to="/terms" className="text-sm text-accent hover:underline">
                用户协议 →
              </Link>
              <Link to="/disclaimer" className="text-sm text-accent hover:underline">
                免责声明 →
              </Link>
            </div>
          </Card>
        </>
      )}
    </StaticPage>
  )
}
