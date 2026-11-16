// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 三态组件（空 / 错误）。
 *
 * 这两个组件的意义是「不拿演示数据冒充真实内容」，所以断言重点在文案与可操作项：
 * 空态必须给创作入口，错误态必须给重试按钮——只有一句「加载失败」而没有出口，
 * 用户就只剩刷新整页这一条路。
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState, ErrorState } from '../../src/components/feedback/States'

describe('EmptyState', () => {
  it('默认文案指向创作，并渲染标题与引导语', () => {
    render(<EmptyState onAction={() => {}} />)
    expect(screen.getByRole('heading', { name: /第一篇由你写下/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /写下第一篇/ })).toBeInTheDocument()
  })

  it('点击按钮触发动作回调', async () => {
    const onAction = vi.fn()
    render(<EmptyState onAction={onAction} />)
    await userEvent.click(screen.getByRole('button', { name: /写下第一篇/ }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('传入自定义文案时覆盖默认值，不残留默认引导语', () => {
    render(
      <EmptyState
        title="还没有评论"
        description="说点什么"
        actionLabel="写评论"
        onAction={() => {}}
      />,
    )
    expect(screen.getByRole('heading', { name: '还没有评论' })).toBeInTheDocument()
    expect(screen.getByText('说点什么')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /写评论/ })).toBeInTheDocument()
    expect(screen.queryByText(/第一篇由你写下/)).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('渲染错误标题与重试按钮', () => {
    render(<ErrorState onRetry={() => {}} />)
    expect(screen.getByRole('heading', { name: '内容加载失败' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重新加载/ })).toBeInTheDocument()
  })

  it('重试按钮调用 onRetry', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /重新加载/ }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
