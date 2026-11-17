// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 人机验证字段组件测试。
 *
 * mock 掉两件外部环境：altcha 的 Web Component 注册（jsdom 不实现 customElements），
 * 以及 apiGet（不依赖真实网络）。测的是组件自己的逻辑：拉取挑战并下发、监听求解结果、
 * 通过 ref 暴露载荷、加载失败显示提示。
 */
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { AltchaField, type AltchaHandle } from '../../../src/features/auth/AltchaField'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('altcha', () => ({}))

vi.mock('../../../src/lib/api-client', () => ({
  apiGet: (path: string) => mocks.get(path),
}))

beforeEach(() => {
  mocks.get.mockReset()
  cleanup()
})

/** 触发 widget 节点的 statechange，模拟求解完成。 */
function emitState(payload: string | undefined) {
  const widget = document.querySelector('altcha-widget')
  widget?.dispatchEvent(new CustomEvent('statechange', { detail: { payload } }))
}

describe('AltchaField', () => {
  it('拉取挑战并下发给 widget，求解后经 ref 暴露载荷', async () => {
    mocks.get.mockResolvedValue({ data: { challenge: '{"parameters":{}}' } })
    const ref = createRef<AltchaHandle>()
    render(<AltchaField ref={ref} />)

    await waitFor(() => {
      expect(document.querySelector('altcha-widget')).toHaveAttribute(
        'challenge',
        '{"parameters":{}}',
      )
    })
    expect(mocks.get).toHaveBeenCalledWith('auth/challenge')
    expect(ref.current?.getPayload()).toBeNull()

    emitState('solved-payload')
    await waitFor(() => expect(ref.current?.getPayload()).toBe('solved-payload'))
    expect(screen.queryByText(/正在进行安全验证/)).not.toBeInTheDocument()
  })

  it('挑战请求失败时显示刷新提示，不渲染 widget', async () => {
    mocks.get.mockRejectedValue(new Error('network'))
    render(<AltchaField />)
    expect(await screen.findByRole('alert')).toHaveTextContent('安全验证加载失败')
    expect(document.querySelector('altcha-widget')).toBeNull()
  })

  it('求解中显示提示，收到空载荷时保持未完成', async () => {
    mocks.get.mockResolvedValue({ data: { challenge: '{}' } })
    const ref = createRef<AltchaHandle>()
    render(<AltchaField ref={ref} />)
    expect(screen.getByText(/正在进行安全验证/)).toBeInTheDocument()

    await waitFor(() => expect(document.querySelector('altcha-widget')).not.toBeNull())
    emitState(undefined)
    await waitFor(() => expect(ref.current?.getPayload()).toBeNull())
  })
})
