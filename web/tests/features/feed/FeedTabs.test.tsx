// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 信息流排序切换的无障碍语义回归。
 *
 * 这里曾经借 Radix Tabs 的 Trigger 渲染样式，但没有对应的 Content，
 * 于是每个按钮都带一个指向不存在 id 的 aria-controls（axe: critical）。
 * 三个选项改的是同一个信息流的查询条件，不是切换面板，
 * 所以用按钮组 + aria-pressed 才是正确的语义。
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedTabs } from '../../../src/features/feed/components/FeedTabs'

describe('FeedTabs', () => {
  it('渲染为带标签的按钮组，当前排序只有一个 aria-pressed 为真', () => {
    render(<FeedTabs value="latest" onChange={() => {}} />)
    const group = screen.getByRole('group', { name: '信息流排序' })
    expect(group).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '最新' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('点击非当前项时通知父组件切换排序', async () => {
    const onChange = vi.fn()
    render(<FeedTabs value="latest" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '热门' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith('popular')
  })

  it('不再产生指向不存在面板的 role=tab 与 aria-controls', () => {
    render(<FeedTabs value="recommended" onChange={() => {}} />)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    for (const button of screen.getAllByRole('button')) {
      expect(button).not.toHaveAttribute('aria-controls')
    }
  })
})
