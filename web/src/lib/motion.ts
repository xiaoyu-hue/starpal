// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 动效参数单一真源：与 styles/tokens.css 的 --sp-motion / --sp-ease 保持同一节奏。
 * 组件的编排动画从这里取值，避免各处散写魔法数字、和 CSS 过渡对不上拍。
 *
 * 只放纯常量与变体，不引入 React，便于树摇与单测。
 */

/** 与 --sp-ease（cubic-bezier(0.2, 0.7, 0.3, 1)）等价的三次贝塞尔控制点。 */
export const SP_EASE = [0.2, 0.7, 0.3, 1] as const

/** 与 --sp-motion（220ms）等价的秒数。 */
export const SP_DURATION = 0.22

/**
 * 水滴软弹：点赞/收藏等互动的按压回弹。用 spring 而非 duration，
 * 松手时带一点过冲再回稳，模拟水滴的表面张力；stiffness/damping 调到
 * 「有弹性但不晃」——过度弹跳会显得廉价且干扰连点。
 */
export const waterDropSpring = {
  type: 'spring',
  stiffness: 500,
  damping: 24,
  mass: 0.6,
} as const

/** 收藏图标点亮时的水滴脉冲：轻微放大再回原位。 */
export const waterDropPulse = [1, 1.3, 1] as const

/** 列表逐项入场的通用变体：轻微上浮 + 淡入，克制不喧宾夺主。 */
export const riseVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: SP_DURATION, ease: SP_EASE } },
} as const

/**
 * 计算第 index 项的入场延迟：多项错峰，但封顶避免长列表末尾等待过久。
 * 用 view 刷新或筛选后重新挂载时，能形成自上而下的流畅节奏。
 */
export function staggerDelay(index: number, step = 0.045, max = 0.36): number {
  return Math.min(index * step, max)
}
