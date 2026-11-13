import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** 内容卡片：实色、高可读，不套玻璃。 */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('sp-card p-5', className)} {...rest}>
      {children}
    </div>
  )
}

type BadgeProps = {
  children: ReactNode
  variant?: 'topic' | 'accent' | 'neutral'
  className?: string
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    topic: 'bg-accent-soft text-accent',
    accent: 'bg-accent text-on-accent',
    neutral: 'bg-subtle text-muted border border-line',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

type AvatarProps = {
  name: string
  size?: number
  className?: string
}

export function Avatar({ name, size = 40, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </span>
  )
}
