// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type HTMLAttributes, type ReactNode } from 'react'
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
  variant?: 'topic' | 'accent' | 'neutral' | 'warn'
  className?: string
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    topic: 'bg-accent-soft text-accent',
    accent: 'bg-accent text-on-accent',
    neutral: 'bg-subtle text-muted border border-line',
    // 状态类标签需要比正文更醒目，但不该像新功能那样显眼：用危险色的浅底，不加边框。
    warn: 'bg-[var(--sp-danger-soft)] text-[var(--sp-danger)]',
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
  /** 显示名（或用户名），用于无图时取首字。 */
  name: string
  /** 头像图片地址；为空或加载失败时回退到首字圆形占位。 */
  src?: string | null
  size?: number
  className?: string
}

export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const [broken, setBroken] = useState(false)
  const showImage = Boolean(src) && !broken
  if (showImage) {
    return (
      <img
        src={src as string}
        alt=""
        width={size}
        height={size}
        className={cn('shrink-0 rounded-full object-cover', className)}
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
      />
    )
  }
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
