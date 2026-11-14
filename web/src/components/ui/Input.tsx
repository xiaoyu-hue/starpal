// SPDX-License-Identifier: AGPL-3.0-or-later
import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
}

/** 带语义 label、描述关联与错误态的输入框。 */
export function Input({ label, hint, error, className, id, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'sp-transition h-10 w-full rounded-md bg-surface px-3 text-ink',
          'border border-line placeholder:text-faint',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--sp-accent-soft)]',
          error && 'border-[var(--sp-danger)]',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-[var(--sp-danger)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
