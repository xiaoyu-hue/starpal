import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover border border-transparent',
  secondary: 'bg-surface text-ink border border-line hover:bg-subtle hover:border-line-strong',
  ghost: 'bg-transparent text-muted border border-transparent hover:bg-subtle hover:text-ink',
  danger:
    'bg-transparent text-[var(--sp-danger)] border border-[var(--sp-danger)] hover:bg-[var(--sp-danger-soft)]',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-sm gap-1.5',
  md: 'h-10 px-4 text-sm rounded-md gap-2',
  lg: 'h-12 px-5 text-base rounded-md gap-2',
}

/** 样式单独导出，供 Radix Trigger 等原生元素复用，避免重复定义。 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'sp-transition inline-flex items-center justify-center font-medium select-none cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="sp-spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}
