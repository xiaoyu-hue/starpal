import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Primitives'
import { Section, StaticPage, StatusLine } from './StaticPage'
import { usePrivacyQuery } from './meta.queries'

/** 隐私说明页：消费 /api/meta/privacy，文案与后端 PRIVACY 常量一致。 */
export function PrivacyPage() {
  const { data, isLoading, isError } = usePrivacyQuery()
  return (
    <StaticPage title="隐私说明">
      {isLoading && <StatusLine text="加载中…" />}
      {isError && <StatusLine text="加载失败，请刷新重试。" tone="danger" />}
      {data &&
        data.sections.map((s) => (
          <Section key={s.heading} heading={s.heading} paragraphs={s.paragraphs} />
        ))}
      {data && (
        <Card className="flex items-center justify-between p-4">
          <span className="text-xs text-faint">版本 {data.version}</span>
          <Link to="/guidelines" className="text-sm text-accent hover:underline">
            查看社区准则 →
          </Link>
        </Card>
      )}
    </StaticPage>
  )
}
