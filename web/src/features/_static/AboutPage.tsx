// SPDX-License-Identifier: AGPL-3.0-or-later
import { Card } from '../../components/ui/Primitives'
import { StarpalMark } from '../../components/brand/StarpalLogo'
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
        <>
          <Card className="space-y-3 p-6">
            <div className="flex items-center gap-3">
              <StarpalMark size={28} decorative />
              <div>
                <h2 className="text-base font-semibold text-ink">{data.siteName}</h2>
                <p className="text-xs text-faint">{data.tagline}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-faint">
              <span>版本 {data.version}</span>
              <span>建站于 {data.launchDate}</span>
            </div>
            <div className="space-y-2">
              {data.intro.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            {data.whatWeDo.map((item) => (
              <Card key={item.title} className="space-y-1.5 p-4">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="text-xs leading-relaxed text-muted">{item.body}</p>
              </Card>
            ))}
          </div>

          <Card className="space-y-4 p-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-ink">技术与依赖</h2>
              <p className="text-xs leading-relaxed text-faint">
                只写「用了什么、为什么」，不列版本号——精确版本会告诉攻击者该试哪个已知漏洞，而本站没有专职安全响应能力。
              </p>
            </div>
            {data.stack.map((group) => (
              <div key={group.group} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">
                  {group.group}
                </h3>
                <dl className="space-y-2">
                  {group.items.map((item) => (
                    <div key={item.name} className="text-sm leading-relaxed">
                      <dt className="inline font-medium text-ink">{item.name}</dt>
                      <dd className="inline text-muted"> — {item.role}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </Card>

          <Card className="space-y-2 p-5">
            <h2 className="text-base font-semibold text-ink">{data.credits.heading}</h2>
            {data.credits.paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </Card>

          <Card className="space-y-2 p-5">
            <h2 className="text-base font-semibold text-ink">{data.feedback.heading}</h2>
            {data.feedback.paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </Card>
        </>
      )}
    </StaticPage>
  )
}
