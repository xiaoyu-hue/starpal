// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 主题解析与落盘。
 *
 * 关键不变量：localStorage 里存的是**用户的选择**（含 `system`），不是解析后的结果。
 * 若把解析结果写回存储，用户切到「跟随系统」就再也回不去了——系统换配色时页面不跟。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, readTheme } from '../../src/lib/theme'

const STORAGE_KEY = 'starpal-theme'

/** jsdom 不实现 matchMedia，按用例注入系统偏好。 */
function stubPrefersDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: dark && query.includes('dark'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

describe('readTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('没有存储时默认跟随系统', () => {
    expect(readTheme()).toBe('system')
  })

  it('合法值原样返回', () => {
    for (const theme of ['light', 'dark', 'system'] as const) {
      window.localStorage.setItem(STORAGE_KEY, theme)
      expect(readTheme()).toBe(theme)
    }
  })

  it('存储被写脏时回退 system，而不是把脏值抛给界面', () => {
    window.localStorage.setItem(STORAGE_KEY, 'midnight')
    expect(readTheme()).toBe('system')
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.removeProperty('color-scheme')
    document.querySelector('meta[name="theme-color"]')?.remove()
    stubPrefersDark(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('固定选择直接生效，并写入 data-theme 与 color-scheme', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('跟随系统时按系统偏好解析出实际明暗，但存储保留 system', () => {
    stubPrefersDark(true)
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('system')
  })

  it('系统偏好为亮色时解析为 light', () => {
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('存在 theme-color meta 时同步内容，无 CSS 变量时回退到内置色值', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.append(meta)

    applyTheme('dark')
    expect(meta.getAttribute('content')).toBe('#10131C')

    applyTheme('light')
    expect(meta.getAttribute('content')).toBe('#FAF9F7')
  })

  it('页面没有 theme-color meta 时不抛错', () => {
    expect(() => applyTheme('dark')).not.toThrow()
  })
})
