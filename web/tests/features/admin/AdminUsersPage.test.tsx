// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 治理后台 · 成员管理页。
 *
 * 这一页最要紧的不是「列表能不能渲染」，而是**停用这类破坏性动作有没有确认**。
 * 一个少写的 `window.confirm` 会让管理员误点一次就隐藏掉一个真实成员的全部内容，
 * 而界面上没有任何回退提示——这种缺陷人类点几下也测不出来，只能靠用例钉住。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminUsersPage } from '../../../src/features/admin/AdminUsersPage'
import type { AdminUser } from '../../../src/types/admin'

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  query: {
    data: undefined as { pages: { items: AdminUser[] }[] } | undefined,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  },
}))

vi.mock('../../../src/features/admin/admin.queries', () => ({
  useAdminUsersQuery: () => mocks.query,
  useSetUserStatusMutation: () => ({ mutateAsync: mocks.mutateAsync }),
}))

function user(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 1,
    username: 'alice',
    displayName: '爱丽丝',
    role: 'user',
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

function withUsers(items: AdminUser[]) {
  mocks.query.data = { pages: [{ items }] }
}

beforeEach(() => {
  mocks.mutateAsync.mockReset()
  mocks.mutateAsync.mockResolvedValue(undefined)
  mocks.query = {
    ...mocks.query,
    data: undefined,
    isPending: false,
    isError: false,
    hasNextPage: false,
  }
})

describe('AdminUsersPage', () => {
  it('渲染成员、角色与状态标签', () => {
    withUsers([user()])
    render(<AdminUsersPage />)

    expect(screen.getByText('@alice')).toBeInTheDocument()
    expect(screen.getByText(/爱丽丝/)).toBeInTheDocument()
    expect(screen.getByText('成员')).toBeInTheDocument()
    expect(screen.getByText('正常')).toBeInTheDocument()
  })

  it('停用操作必须经过确认；用户取消时一个请求都不发', async () => {
    withUsers([user()])
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminUsersPage />)

    await userEvent.click(screen.getByRole('button', { name: '停用' }))

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm.mock.calls[0]?.[0]).toContain('@alice')
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
  })

  it('确认后提交停用，参数只带 id 与目标状态', async () => {
    withUsers([user()])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminUsersPage />)

    await userEvent.click(screen.getByRole('button', { name: '停用' }))

    expect(mocks.mutateAsync).toHaveBeenCalledWith({ id: 1, status: 'suspended' })
  })

  it('已停用的成员显示「恢复」，且恢复不需要弹确认', async () => {
    withUsers([user({ status: 'suspended' })])
    const confirm = vi.spyOn(window, 'confirm')
    render(<AdminUsersPage />)

    expect(screen.getByText('已停用')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '恢复' }))

    expect(confirm).not.toHaveBeenCalled()
    expect(mocks.mutateAsync).toHaveBeenCalledWith({ id: 1, status: 'active' })
  })

  it('写操作失败时显示可见错误提示（UX-1）', async () => {
    withUsers([user()])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.mutateAsync.mockRejectedValueOnce(new Error('network'))
    render(<AdminUsersPage />)

    await userEvent.click(screen.getByRole('button', { name: '停用' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('操作失败')
  })

  it('已注销成员不提供任何操作按钮（不用「恢复」暗示可复活）', () => {
    withUsers([user({ status: 'deleted' })])
    render(<AdminUsersPage />)

    expect(screen.getByText('已注销')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '停用' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '恢复' })).not.toBeInTheDocument()
  })

  it('加载失败时给出重试入口', async () => {
    mocks.query.isError = true
    render(<AdminUsersPage />)

    await userEvent.click(screen.getByRole('button', { name: /重新加载/ }))
    expect(mocks.query.refetch).toHaveBeenCalled()
  })

  it('没有成员时显示空态文案而不是空白', () => {
    withUsers([])
    render(<AdminUsersPage />)
    expect(screen.getByText(/还没有成员/)).toBeInTheDocument()
  })

  it('还有下一页时才显示「加载更多」', async () => {
    withUsers([user()])
    mocks.query.hasNextPage = true
    render(<AdminUsersPage />)

    await userEvent.click(screen.getByRole('button', { name: '加载更多' }))
    expect(mocks.query.fetchNextPage).toHaveBeenCalled()
  })
})
