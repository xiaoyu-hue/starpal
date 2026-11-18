// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 主题选择无障碍回归（审查 M7）。
 *
 * 这里曾用原生 <button role="radio" aria-checked> 模拟单选组，但没有方向键行为——
 * 读屏用户按左右键不会切换，与「M7 无障碍达标」声明不符。改用真 <input type="radio">
 * + <label> 后，方向键导航由浏览器原生提供。本测试钉住「是真 radio」这一关键点。
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const setTheme = vi.fn()
vi.mock('../../../src/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', setTheme, toggleTheme: vi.fn() }),
}))

import { ThemeSection } from '../../../src/features/profile/SettingsSections'

describe('ThemeSection 主题单选无障碍', () => {
  it('渲染为带标签的 radio 单选组，当前项选中', () => {
    render(<ThemeSection />)
    const group = screen.getByRole('group', { name: '主题选择' })
    expect(group).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(screen.getByRole('radio', { name: '浅色' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '深色' })).not.toBeChecked()
  })

  it('每个选项是真 input radio（原生方向键导航可用），不是模拟的 button', () => {
    render(<ThemeSection />)
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.tagName).toBe('INPUT')
      expect(radio).toHaveAttribute('type', 'radio')
      expect(radio).toHaveAttribute('name', 'theme')
    }
  })

  it('选择非当前项时通知父组件切换主题', async () => {
    setTheme.mockClear()
    render(<ThemeSection />)
    await userEvent.click(screen.getByRole('radio', { name: '深色' }))
    expect(setTheme).toHaveBeenCalledExactlyOnceWith('dark')
  })
})
