// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react'
import { cn } from '../../lib/cn'

/**
 * 液态玻璃容器：在 .sp-glass 之上叠加「指针/手指跟随的镜面高光」。
 *
 * 实现取舍：
 * - 高光坐标【直接写 CSS 变量】，不进 React state —— 指针移动不触发重渲染，
 *   在手机上滑动也保持流畅；只有「是否显现」用 state（进出各一次）。
 * - 颜色全部来自 tokens.css 的 --sp-glass-sheen，本组件只写百分比坐标，
 *   符合 R2（不在 .tsx 硬编码颜色）。
 * - 系统开启「减少动态效果」时不挂载跟随监听，退化为静态玻璃（无障碍降级）。
 *
 * 用法：把原 <GlassPanel> 换成 <LiquidGlass>，其余 className 保持。
 */
export function LiquidGlass({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null)
  const [sheen, setSheen] = useState(false)

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (reduced) return
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      // 写百分比而非像素：容器尺寸变化时高光仍贴合。
      el.style.setProperty('--sp-glass-x', `${((e.clientX - r.left) / r.width) * 100}%`)
      el.style.setProperty('--sp-glass-y', `${((e.clientY - r.top) / r.height) * 100}%`)
    },
    [reduced],
  )

  return (
    <div
      ref={ref}
      className={cn('sp-glass sp-liquid', className)}
      data-sheen={sheen ? 'on' : 'off'}
      onPointerMove={reduced ? undefined : onMove}
      onPointerEnter={reduced ? undefined : () => setSheen(true)}
      onPointerLeave={reduced ? undefined : () => setSheen(false)}
      {...rest}
    >
      {children}
    </div>
  )
}
