import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ThemeProvider } from '../hooks/useTheme'
import { createQueryClient } from '../lib/query-client'

/** 装配请求缓存与主题 Provider；QueryClient 每次应用生命周期仅创建一次。 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  )
}
