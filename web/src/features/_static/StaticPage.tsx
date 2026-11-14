import type { ReactNode } from 'react'
import { Card } from '../../components/ui/Primitives'

/** 说明页通用外壳：统一标题与纵向留白，内容居中限宽。 */
export function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-2">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

/** 分节卡片：标题 + 若干段落，用于隐私说明与通用长文排版。 */
export function Section({ heading, paragraphs }: { heading: string; paragraphs: string[] }) {
  return (
    <Card className="space-y-2 p-5">
      <h2 className="text-base font-semibold text-ink">{heading}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-muted">
          {p}
        </p>
      ))}
    </Card>
  )
}

/** 加载 / 错误占位：避免骨架闪烁，用一行说明即可。 */
export function StatusLine({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'danger' }) {
  const color = tone === 'danger' ? 'text-[var(--sp-danger)]' : 'text-muted'
  return <p className={`text-sm ${color}`}>{text}</p>
}
