// SPDX-License-Identifier: AGPL-3.0-or-later
import { QueryClientProvider } from '@tanstack/react-query'
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { ThemeProvider } from '../hooks/useTheme'
import { createQueryClient } from '../lib/query-client'
import { AuthProvider } from '../features/auth/AuthProvider'

/**
 * 装配请求缓存、主题与当前会话 Provider；QueryClient 每次应用生命周期仅创建一次。
 *
 * MotionConfig reducedMotion="user"：跟随系统的「减少动态效果」偏好——
 * 开启后位移/缩放类动画自动降级为仅淡入，与 styles/globals.css 里的
 * prefers-reduced-motion 媒体查询保持同一无障碍口径。
 *
 * LazyMotion + domAnimation：只加载精简动效引擎（比完整 motion 组件省约一半体积），
 * strict 强制全站统一用 m.* 组件，避免误用 motion.* 把完整包带回来。
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation} strict>{children}</LazyMotion>
          </MotionConfig>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
