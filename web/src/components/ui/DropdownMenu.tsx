// SPDX-License-Identifier: AGPL-3.0-or-later
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { buttonClass } from './Button'

export type MenuItem = { label: string; value: string }

type MenuProps = {
  label: string
  items: MenuItem[]
  selected?: string
  onSelect: (value: string) => void
}

/** 下拉菜单：键盘可操作，选择结果由调用方真实记录。 */
export function Menu({ label, items, selected, onSelect }: MenuProps) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger className={buttonClass('secondary', 'md')}>
        {label}
        <ChevronDown size={16} />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content className="sp-menu sp-glass" sideOffset={8} align="start">
          <MenuPrimitive.Label className="px-3 py-2 text-xs text-faint">
            选择一项（结果会显示在下方）
          </MenuPrimitive.Label>
          <MenuPrimitive.Separator className="my-1 h-px bg-[var(--sp-border)]" />
          {items.map((item) => (
            <MenuPrimitive.Item
              key={item.value}
              onSelect={() => onSelect(item.value)}
              className="sp-transition flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent"
            >
              {item.label}
              {selected === item.value ? <span className="text-xs text-accent">已选</span> : null}
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}
