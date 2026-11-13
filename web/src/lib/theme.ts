export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'starpal-theme'

/** 读取主题：手动选择优先，其次跟随系统。 */
export function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 应用主题：写入 data-theme、同步浏览器配色与 theme-color。 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  window.localStorage.setItem(STORAGE_KEY, theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#10131C' : '#FAF9F7')
}
