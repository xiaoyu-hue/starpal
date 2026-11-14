// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react'
import type { DocBlock, DocSection } from '../../types/api'
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

/**
 * 文档抬头：摘要 + 版本 + 两个日期。
 * 摘要放最前是刻意的——长文默认没人读完，把「底线」提到第一屏才有意义。
 */
export function DocHeader({
  summary,
  version,
  updatedAt,
  effectiveAt,
}: {
  summary: string
  version: string
  updatedAt: string
  effectiveAt: string
}) {
  return (
    <Card className="space-y-3 p-5">
      <p className="text-sm leading-relaxed text-ink">{summary}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-faint">
        <span>版本 {version}</span>
        <span>最后更新 {updatedAt}</span>
        <span>生效日期 {effectiveAt}</span>
      </div>
    </Card>
  )
}

/** 单个内容块。四种 kind 对应四种排版，未知 kind 直接忽略而非崩溃。 */
function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case 'sub':
      return <h3 className="pt-1 text-sm font-semibold text-ink">{block.text}</h3>
    case 'list':
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'note':
      return (
        <p className="rounded-sm border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm leading-relaxed text-muted">
          {block.text}
        </p>
      )
    default:
      return <p className="text-sm leading-relaxed text-muted">{block.text}</p>
  }
}

/** 分节卡片：标题 + 内容块序列，隐私说明与社区准则共用。 */
export function Section({ heading, blocks }: DocSection) {
  return (
    <Card className="space-y-2.5 p-5">
      <h2 className="text-base font-semibold text-ink">{heading}</h2>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </Card>
  )
}

/** 加载 / 错误占位：避免骨架闪烁，用一行说明即可。 */
export function StatusLine({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'danger' }) {
  const color = tone === 'danger' ? 'text-[var(--sp-danger)]' : 'text-muted'
  return <p className={`text-sm ${color}`}>{text}</p>
}
