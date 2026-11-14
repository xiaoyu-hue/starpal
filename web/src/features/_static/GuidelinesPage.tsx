import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Primitives'
import { StaticPage, StatusLine } from './StaticPage'
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
          <Card className="p-5">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
              {data.principles.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-2 p-5">
            <h2 className="text-base font-semibold text-ink">申诉与审核</h2>
            <p className="text-sm leading-relaxed text-muted">
              若你认为某条内容违反上述准则，可通过站内申诉路径反馈；审核责任由运营团队承担，处置结果会告知申诉方。
            </p>
          </Card>
          <Card className="flex items-center justify-between p-4">
            <span className="text-xs text-faint">版本 {data.version} · 准则由维护者发布前审定</span>
            <Link to="/privacy" className="text-sm text-accent hover:underline">
              隐私说明 →
            </Link>
          </Card>
        </>
      )}
    </StaticPage>
  )
}
