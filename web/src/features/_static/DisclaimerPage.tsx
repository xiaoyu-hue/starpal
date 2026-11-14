// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Primitives'
import { DocHeader, Section, StaticPage, StatusLine } from './StaticPage'
import { useDisclaimerQuery } from './meta.queries'

/** 免责声明页：消费 /api/meta/disclaimer，与用户协议互为补充。 */
export function DisclaimerPage() {
  const { data, isLoading, isError } = useDisclaimerQuery()
  return (
    <StaticPage title="免责声明">
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
              版本 {data.version} · 生效 {data.effectiveAt}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link to="/terms" className="text-sm text-accent hover:underline">
                用户协议 →
              </Link>
              <Link to="/guidelines" className="text-sm text-accent hover:underline">
                社区准则 →
              </Link>
              <Link to="/privacy" className="text-sm text-accent hover:underline">
                隐私说明 →
              </Link>
            </div>
          </Card>
        </>
      )}
    </StaticPage>
  )
}
