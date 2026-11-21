// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 动效参数工具：验证与 CSS 令牌的同源值与错峰封顶。
 * 这些常量是对齐 CSS --sp-motion / --sp-ease 的单一真源，一旦被改错，
 * 库的编排动画就会和原生 CSS 过渡节奏脱节，所以要钉住。
 */
import { describe, expect, it } from 'vitest'
import {
  riseVariants,
  SP_DURATION,
  SP_EASE,
  staggerDelay,
  waterDropPulse,
  waterDropSpring,
} from '../../src/lib/motion'

describe('动效令牌对齐', () => {
  it('缓动控制点与 --sp-ease 一致', () => {
    expect([...SP_EASE]).toEqual([0.2, 0.7, 0.3, 1])
  })

  it('时长与 --sp-motion（220ms）一致', () => {
    expect(SP_DURATION).toBeCloseTo(0.22)
  })

  it('入场变体从透明下方位移到实色原位', () => {
    expect(riseVariants.hidden).toEqual({ opacity: 0, y: 8 })
    expect(riseVariants.visible.opacity).toBe(1)
    expect(riseVariants.visible.y).toBe(0)
    expect(riseVariants.visible.transition.duration).toBe(SP_DURATION)
  })
})

describe('水滴软弹参数', () => {
  it('回弹用 spring 且阻尼比在「有弹性但收敛」区间', () => {
    expect(waterDropSpring.type).toBe('spring')
    expect(waterDropSpring.stiffness).toBeGreaterThan(0)
    expect(waterDropSpring.damping).toBeGreaterThan(0)
    // 阻尼比 ζ<1 才有轻微过冲的水滴弹性；但不宜过低（<0.5 会来回晃），
    // 取 0.5~1：既回弹又快速收敛，不干扰连点。
    const ratio = waterDropSpring.damping / (2 * Math.sqrt(waterDropSpring.stiffness * waterDropSpring.mass))
    expect(ratio).toBeGreaterThan(0.5)
    expect(ratio).toBeLessThan(1)
  })

  it('脉冲是放大一回位的三段关键帧', () => {
    expect([...waterDropPulse]).toEqual([1, 1.3, 1])
  })
})

describe('staggerDelay 错峰延迟', () => {
  it('按步长线性递增', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(2)).toBeCloseTo(0.09)
  })

  it('长列表封顶，避免末尾等待过久', () => {
    expect(staggerDelay(100)).toBe(0.36)
    expect(staggerDelay(1000)).toBe(0.36)
  })

  it('自定义步长与上限生效', () => {
    expect(staggerDelay(3, 0.1, 0.25)).toBe(0.25)
  })
})
