import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { StarpalMark } from '../../components/brand/StarpalLogo'
import { buttonClass } from '../../components/ui/Button'
import { DESTINATIONS, DESKTOP_KEYS } from './nav-items'

type MobileMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 平板抽屉：与桌面共用同一目的地集合，避免两套互相冲突的定义。 */
export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sp-overlay sp-enter" />
        <DialogPrimitive.Content className="sp-glass sp-dialog sp-enter left-0 top-0 h-full w-[min(82vw,300px)] translate-x-0 translate-y-0 rounded-none p-5">
          <div className="mb-5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <StarpalMark size={22} decorative />
              <span className="text-sm font-semibold tracking-wide text-ink">
                星聚 <span className="font-normal text-faint">STARPAL</span>
              </span>
            </span>
            <DialogPrimitive.Close aria-label="关闭菜单" className={buttonClass('ghost', 'sm')}>
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          {/* 标题仅供读屏：视觉上已由品牌行承担，避免「星聚」与「导航」两套标题并列。 */}
          <DialogPrimitive.Title className="sr-only">导航</DialogPrimitive.Title>
          <nav aria-label="抽屉导航" className="flex flex-col gap-1">
            {DESKTOP_KEYS.map((key) => {
              const item = DESTINATIONS[key]!
              const Icon = item.icon
              return (
                <Link
                  key={key}
                  to={item.path}
                  onClick={() => onOpenChange(false)}
                  className={buttonClass('ghost', 'md', '!justify-start')}
                >
                  <Icon size={17} /> {item.label}
                </Link>
              )
            })}
            <Link
              to="/messages"
              onClick={() => onOpenChange(false)}
              className={buttonClass('ghost', 'md', '!justify-start')}
            >
              <DESTINATIONS.messages.icon size={17} /> 私信
            </Link>
          </nav>
          <DialogPrimitive.Description className="sr-only">
            选择要前往的页面
          </DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
