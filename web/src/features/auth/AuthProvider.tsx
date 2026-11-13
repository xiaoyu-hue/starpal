import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiError } from '../../lib/api-client'
import type { LoginPayload, PublicUser, RegisterPayload } from '../../types/api'
import { fetchMe, loginUser, logoutUser, registerUser } from './api'

type AuthContextValue = {
  /** null = 未登录；loading=true 表示正在读取会话，用于避免首屏闪出登录按钮。 */
  user: PublicUser | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<PublicUser>
  register: (payload: RegisterPayload) => Promise<PublicUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * 当前会话 Provider。
 *
 * 取舍：认证态是全局单例，且需要明确「加载中 / 已登录 / 未登录」三态，
 * 这里用轻量 Context 而非请求缓存——登录 / 登出后直接更新，避免缓存失效链
 * 的隐式行为。权限判定始终以后端为准，此处的 user 仅用于界面呈现。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const started = useRef(false)

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchMe())
    } catch (error) {
      // 401 是「未登录」的正常结果；其它错误也按未登录处理，不阻断页面渲染。
      if (!(error instanceof ApiError) || error.status !== 401) {
        console.warn('读取当前会话失败', error)
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (started.current) return // StrictMode 下避免重复请求
    started.current = true
    void refresh()
  }, [refresh])

  const login = useCallback(async (payload: LoginPayload) => {
    const next = await loginUser(payload)
    setUser(next)
    return next
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    // 服务端注册不发放会话凭证，注册成功后仍需显式登录一次。
    return registerUser(payload)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } catch (error) {
      // 请求失败仍清除本地态，避免界面停在错误状态；刷新会重新读取真实会话。
      console.warn('登出请求失败', error)
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return value
}
