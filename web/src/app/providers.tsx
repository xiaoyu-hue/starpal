import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ThemeProvider } from '../hooks/useTheme'
import { createQueryClient } from '../lib/query-client'
import { AuthProvider } from '../features/auth/AuthProvider'

/** 装配请求缓存、主题与当前会话 Provider；QueryClient 每次应用生命周期仅创建一次。 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
