// SPDX-License-Identifier: AGPL-3.0-or-later
import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/** 全站唯一的玻璃容器组件；参数由 tokens.css 统一给定。 */
export function GlassPanel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('sp-glass rounded-md', className)} {...rest}>
      {children}
    </div>
  )
}
