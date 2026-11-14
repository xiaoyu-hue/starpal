// SPDX-License-Identifier: AGPL-3.0-or-later
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { buttonClass } from './Button'

type ModalProps = {
  trigger: ReactNode
  title: string
  description: string
  children?: ReactNode
}

/** 基于 Radix 的模态框：焦点陷阱、Esc 关闭、语义标题与描述。 */
export function Modal({ trigger, title, description, children }: ModalProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sp-overlay" />
        <DialogPrimitive.Content className="sp-dialog sp-glass sp-enter">
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="text-lg font-semibold text-ink">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="sp-transition rounded-sm p-1 text-faint hover:bg-subtle hover:text-ink"
              aria-label="关闭对话框"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted">
            {description}
          </DialogPrimitive.Description>
          {children ? <div className="mt-5">{children}</div> : null}
          <div className="mt-6 flex justify-end">
            <DialogPrimitive.Close className={buttonClass('secondary', 'md')}>
              关闭
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
