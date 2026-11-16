// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 登录 / 注册表单。
 *
 * 这是全站最不能出错的一段：出错的表现是「注册不了」「登录后跳错地方」，
 * 而它包含两类纯逻辑——本地校验与登录后跳转目标。后者是安全问题：
 * `location.state.from` 来自 URL，若不校验，`//evil.com` 就是一个开放重定向。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthForm } from '../../../src/features/auth/AuthForm'
import { ApiError } from '../../../src/lib/api-client'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  locationState: null as unknown,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useLocation: () => ({
      state: mocks.locationState,
      pathname: '/login',
      search: '',
      hash: '',
      key: 'test',
    }),
  }
})

vi.mock('../../../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({ login: mocks.login, register: mocks.register }),
}))

const VALID_PASSWORD = 'correct-horse-battery'

function renderForm(mode: 'login' | 'register') {
  return render(
    <MemoryRouter>
      <AuthForm mode={mode} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.navigate.mockReset()
  mocks.login.mockReset()
  mocks.register.mockReset()
  mocks.locationState = null
})

describe('登录模式 · 本地校验', () => {
  it('空表单提交时逐字段报错，且不调用登录接口', async () => {
    renderForm('login')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText(/用户名需 3—32 个字符/)).toBeInTheDocument()
    expect(screen.getByText(/密码需 12—128 个字符/)).toBeInTheDocument()
    expect(mocks.login).not.toHaveBeenCalled()
  })

  it('用户名含非法字符时提示只允许字母数字下划线', async () => {
    renderForm('login')
    // 三个汉字：长度合法，只有字符集不合法——确保被测的是模式校验而不是长度校验
    await userEvent.type(screen.getByLabelText('用户名'), '张三丰')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('仅允许字母、数字、下划线')).toBeInTheDocument()
    expect(mocks.login).not.toHaveBeenCalled()
  })

  it('校验通过后提交，用户名两端空白被去掉', async () => {
    mocks.login.mockResolvedValue(undefined)
    renderForm('login')
    await userEvent.type(screen.getByLabelText('用户名'), '  alice  ')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith({ username: 'alice', password: VALID_PASSWORD })
    })
  })

  it('修改字段后立刻清掉该字段的错误提示', async () => {
    renderForm('login')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByText(/用户名需 3—32 个字符/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('用户名'), 'alice')
    await waitFor(() => {
      expect(screen.queryByText(/用户名需 3—32 个字符/)).not.toBeInTheDocument()
    })
  })
})

describe('登录模式 · 提交结果与跳转', () => {
  it('接口报错时展示后端给的提示，且停留在当前页', async () => {
    mocks.login.mockRejectedValue(new ApiError('INVALID_CREDENTIALS', '用户名或密码不正确', 401, 'r1'))
    renderForm('login')
    await userEvent.type(screen.getByLabelText('用户名'), 'alice')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('用户名或密码不正确')
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('非领域异常统一提示重试，不把原始错误抛到界面上', async () => {
    mocks.login.mockRejectedValue(new Error('boom'))
    renderForm('login')
    await userEvent.type(screen.getByLabelText('用户名'), 'alice')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('操作失败，请稍后重试')
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument()
  })

  it('没有来源页时跳回首页', async () => {
    mocks.login.mockResolvedValue(undefined)
    renderForm('login')
    await userEvent.type(screen.getByLabelText('用户名'), 'alice')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true }))
  })

  it('站内来源路径原样返回', async () => {
    mocks.locationState = { from: '/posts/7' }
    mocks.login.mockResolvedValue(undefined)
    renderForm('login')
    await userEvent.type(screen.getByLabelText('用户名'), 'alice')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/posts/7', { replace: true }))
  })

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', 'evil.com'])(
    '拒绝站外来源 %s，回落到首页（开放重定向防护）',
    async (from) => {
      mocks.locationState = { from }
      mocks.login.mockResolvedValue(undefined)
      renderForm('login')
      await userEvent.type(screen.getByLabelText('用户名'), 'alice')
      await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
      await userEvent.click(screen.getByRole('button', { name: '登录' }))

      await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true }))
    },
  )
})

describe('注册模式', () => {
  it('未勾选同意条款时拦截提交，并说明原因', async () => {
    renderForm('register')
    await userEvent.type(screen.getByLabelText('用户名'), 'newbie')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.type(screen.getByLabelText('邀请码'), 'INV-123')
    await userEvent.click(screen.getByRole('button', { name: '创建账号' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/请先阅读并勾选同意/)
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('缺少邀请码时按字段报错', async () => {
    renderForm('register')
    await userEvent.type(screen.getByLabelText('用户名'), 'newbie')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: '创建账号' }))

    expect(await screen.findByText('请输入邀请码')).toBeInTheDocument()
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('昵称留空时不下发 displayName 字段（交给服务端用用户名兜底）', async () => {
    mocks.register.mockResolvedValue({ username: 'newbie' })
    renderForm('register')
    await userEvent.type(screen.getByLabelText('用户名'), 'newbie')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.type(screen.getByLabelText('邀请码'), 'INV-123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: '创建账号' }))

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalledWith({
        username: 'newbie',
        password: VALID_PASSWORD,
        inviteCode: 'INV-123',
        acceptTerms: true,
        website: '',
      })
    })
  })

  it('注册成功后带提示跳转到登录页，而不是直接登录', async () => {
    mocks.register.mockResolvedValue({ username: 'newbie' })
    renderForm('register')
    await userEvent.type(screen.getByLabelText('用户名'), 'newbie')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.type(screen.getByLabelText('邀请码'), 'INV-123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: '创建账号' }))

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: { notice: '账号 newbie 创建成功，请登录' },
      })
    })
  })
})

describe('注册模式 · 边界值', () => {
  it('昵称输入框在 64 字符处截断（前端先拦一道，服务端仍会再校验）', async () => {
    renderForm('register')
    const nickname = screen.getByLabelText('昵称（选填）')
    await userEvent.type(nickname, 'x'.repeat(80))
    // maxLength 生效时浏览器层面就写不进去，长度校验分支只在绕过 DOM 时才走到。
    expect((nickname as HTMLInputElement).value).toHaveLength(64)
  })

  it('填了昵称就原样下发（两端空白被去掉）', async () => {
    mocks.register.mockResolvedValue({ username: 'newbie' })
    renderForm('register')
    await userEvent.type(screen.getByLabelText('用户名'), 'newbie')
    await userEvent.type(screen.getByLabelText('昵称（选填）'), '  小新  ')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.type(screen.getByLabelText('邀请码'), 'INV-123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: '创建账号' }))

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: '小新' }),
      )
    })
  })
})

describe('防机器人蜜罐', () => {
  it('蜜罐被填写时原样下发，交由服务端静默丢弃（前端不拦截，避免提示脚本「你被抓到了」）', async () => {
    mocks.login.mockResolvedValue(undefined)
    renderForm('login')
    await userEvent.type(screen.getByLabelText('用户名'), 'alice')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    // 注册才下发 website；登录不发，所以这里改用注册模式验证透传。
    cleanup()
    renderForm('register')
    await userEvent.type(screen.getByLabelText('用户名'), 'alice')
    await userEvent.type(screen.getByLabelText('密码'), VALID_PASSWORD)
    await userEvent.type(screen.getByLabelText('邀请码'), 'INV-123')
    await userEvent.type(screen.getByLabelText('请勿填写此字段'), 'bot')
    await userEvent.click(screen.getByRole('checkbox'))

    mocks.register.mockResolvedValue({ username: 'alice' })
    await userEvent.click(screen.getByRole('button', { name: '创建账号' }))

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalledWith(expect.objectContaining({ website: 'bot' }))
    })
  })

  it('蜜罐字段对读屏隐藏、键盘不可达', () => {
    renderForm('login')
    const honeypot = screen.getByLabelText('请勿填写此字段')
    expect(honeypot).toHaveAttribute('name', 'website')
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull()
  })
})
