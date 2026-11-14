// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Primitives'
import { DocHeader, Section, StaticPage, StatusLine } from './StaticPage'
import { useTermsQuery } from './meta.queries'

/** 用户协议页：消费 /api/meta/terms，注册勾选同意指向同一份文案。 */
export function TermsPage() {
  const { data, isLoading, isError } = useTermsQuery()
  return (
    <StaticPage title="用户协议">
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
              <Link to="/guidelines" className="text-sm text-accent hover:underline">
                社区准则 →
              </Link>
              <Link to="/privacy" className="text-sm text-accent hover:underline">
                隐私说明 →
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
