import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyTheme, readTheme, type Theme } from '../lib/theme'

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** 主题 Provider：手动选择优先，刷新后由本地存储恢复；跟随系统时实时响应系统偏好。 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // 跟随系统：监听系统配色变化，仅在用户选择为 system 时实时刷新。
  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((current) => (current === 'light' ? 'dark' : 'light')),
    [],
  )

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme 必须在 ThemeProvider 内使用')
  return value
}
