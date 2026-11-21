// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 液态玻璃容器：验证高光层的类名/状态切换、指针跟随写入 CSS 变量，
 * 以及系统「减少动态效果」时的降级（不挂跟随监听）。
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiquidGlass } from '../../../src/components/layout/LiquidGlass'

function setReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce') ? reduce : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

describe('LiquidGlass 液态玻璃容器', () => {
  afterEach(() => {
    // 每个用例后恢复默认：jsdom 无 matchMedia，模拟「未开启减少动效」
    setReducedMotion(false)
  })

  it('始终带玻璃材质与跟随层类名，初始高光关闭', () => {
    setReducedMotion(false)
    render(<LiquidGlass data-testid="glass">内容</LiquidGlass>)
    const el = screen.getByTestId('glass')
    expect(el).toHaveClass('sp-glass', 'sp-liquid')
    expect(el).toHaveAttribute('data-sheen', 'off')
    expect(el).toHaveTextContent('内容')
  })

  it('指针进入显现高光，离开后关闭', () => {
    setReducedMotion(false)
    render(<LiquidGlass data-testid="glass">内容</LiquidGlass>)
    const el = screen.getByTestId('glass')
    fireEvent.pointerEnter(el)
    expect(el).toHaveAttribute('data-sheen', 'on')
    fireEvent.pointerLeave(el)
    expect(el).toHaveAttribute('data-sheen', 'off')
  })

  it('指针移动写入百分比坐标（相对容器尺寸）', () => {
    setReducedMotion(false)
    render(<LiquidGlass data-testid="glass">内容</LiquidGlass>)
    const el = screen.getByTestId('glass')
    // jsdom 下 getBoundingClientRect 默认全 0，手动给一个 200x100、左上角(10,20) 的框
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 10, top: 20, width: 200, height: 100,
      right: 210, bottom: 120, x: 10, y: 20, toJSON: () => ({}),
    } as DOMRect)
    fireEvent.pointerMove(el, { clientX: 110, clientY: 70 })
    expect(el.style.getPropertyValue('--sp-glass-x')).toBe('50%')
    expect(el.style.getPropertyValue('--sp-glass-y')).toBe('50%')
  })

  it('系统减少动态效果时不挂跟随监听，高光恒为关闭', () => {
    setReducedMotion(true)
    render(<LiquidGlass data-testid="glass">内容</LiquidGlass>)
    const el = screen.getByTestId('glass')
    fireEvent.pointerEnter(el)
    fireEvent.pointerMove(el, { clientX: 110, clientY: 70 })
    expect(el).toHaveAttribute('data-sheen', 'off')
    expect(el.style.getPropertyValue('--sp-glass-x')).toBe('')
  })
})
