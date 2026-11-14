// SPDX-License-Identifier: AGPL-3.0-or-later
/** 中心主星代表个体，四颗环绕小星代表不同兴趣与社区。
    使用 currentColor，自动适配浅深两套文本色。 */
const STAR_PATH =
  'M24 7 L27.3 20.7 L41 24 L27.3 27.3 L24 41 L20.7 27.3 L7 24 L20.7 20.7 Z'

const SATELLITES = [
  { x: 9, y: 9, scale: 0.28, opacity: 0.55 },
  { x: 39, y: 10, scale: 0.22, opacity: 0.45 },
  { x: 38, y: 38, scale: 0.26, opacity: 0.5 },
  { x: 10, y: 38, scale: 0.2, opacity: 0.4 },
]

type MarkProps = {
  size?: number
  className?: string
  decorative?: boolean
}

export function StarpalMark({ size = 40, className, decorative = false }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : '星聚 STARPAL 标识'}
    >
      <path d={STAR_PATH} fill="currentColor" />
      {SATELLITES.map((star) => (
        <path
          key={`${star.x}-${star.y}`}
          d={STAR_PATH}
          fill="currentColor"
          opacity={star.opacity}
          transform={`translate(${star.x} ${star.y}) scale(${star.scale}) translate(-24 -24)`}
        />
      ))}
    </svg>
  )
}

type WordmarkProps = {
  compact?: boolean
  className?: string
}

export function StarpalWordmark({ compact = false, className }: WordmarkProps) {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-wide text-ink">星聚</span>
        <span className="text-xs font-medium tracking-[0.16em] text-faint">STARPAL</span>
      </div>
      {!compact && <p className="mt-0.5 text-xs text-muted">让兴趣相遇，让热爱聚集。</p>}
    </div>
  )
}
