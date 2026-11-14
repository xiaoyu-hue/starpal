// SPDX-License-Identifier: AGPL-3.0-or-later
export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'starpal-theme'

/** 解析「跟随系统」为实际明暗：系统偏好优先于固定选择之外的情形。 */
function resolve(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

/** 读取主题：手动选择优先，其次跟随系统（首次访问的默认）。 */
export function readTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'system'
}

/** 应用主题：写入 data-theme、同步浏览器配色与 theme-color；跟随系统时按系统偏好解析。 */
export function applyTheme(theme: Theme): void {
  const resolved = resolve(theme)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
  window.localStorage.setItem(STORAGE_KEY, theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    // 主题配色取自令牌单一来源（CSS 变量），避免页面硬编码色值（M1-S3-T2）。
    const bg = getComputedStyle(root).getPropertyValue('--sp-bg').trim()
    meta.setAttribute('content', bg || (resolved === 'dark' ? '#10131C' : '#FAF9F7'))
  }
}
