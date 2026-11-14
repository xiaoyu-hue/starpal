// SPDX-License-Identifier: AGPL-3.0-or-later
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api-client'

/** 请求缓存配置：单一在途请求、有限重试、错误按领域码判定。 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
        // 同一查询键仅保留一个在途请求，避免快速切 Tab 产生并发堆叠
        networkMode: 'online',
      },
    },
  })
}
