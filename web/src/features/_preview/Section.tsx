import type { ReactNode } from 'react'

type SectionProps = {
  id: string
  index: string
  title: string
  description: string
  children: ReactNode
}

/** 预览页分区容器：不使用卡片套卡片，保持编辑式留白。 */
export function Section({ id, index, title, description, children }: SectionProps) {
  return (
    <section id={id} className="sp-rise scroll-mt-24 border-t border-line pt-8">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-sm bg-accent-soft px-1.5 text-xs font-semibold text-accent">
          {index}
        </span>
        <div>
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}
