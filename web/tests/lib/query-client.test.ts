// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 查询客户端默认策略。
 *
 * 重试策略是有业务含义的：4xx 重试只会把「没有权限」变成三次无谓请求并拖慢报错；
 * 5xx 才值得重试。这条规则写在函数里，很容易在后续调整中被顺手改坏。
 */
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../src/lib/api-client'
import { createQueryClient } from '../../src/lib/query-client'

function retryPolicy() {
  const retry = createQueryClient().getDefaultOptions().queries?.retry
  if (typeof retry !== 'function') throw new Error('retry 应为函数策略')
  return retry
}

describe('createQueryClient', () => {
  it('缓存时长按设计值设置', () => {
    const queries = createQueryClient().getDefaultOptions().queries
    expect(queries?.staleTime).toBe(30_000)
    expect(queries?.gcTime).toBe(5 * 60_000)
    expect(queries?.refetchOnWindowFocus).toBe(false)
  })

  it('4xx 领域错误不重试', () => {
    const retry = retryPolicy()
    const notFound = new ApiError('NOT_FOUND', '不存在', 404, 'r1')
    expect(retry(0, notFound)).toBe(false)
    expect(retry(1, notFound)).toBe(false)
  })

  it('5xx 领域错误按次数重试，最多两次', () => {
    const retry = retryPolicy()
    const serverError = new ApiError('INTERNAL_ERROR', '服务异常', 500, 'r2')
    expect(retry(0, serverError)).toBe(true)
    expect(retry(1, serverError)).toBe(true)
    expect(retry(2, serverError)).toBe(false)
  })

  it('非 ApiError 的异常（含网络错误）同样最多重试两次', () => {
    const retry = retryPolicy()
    expect(retry(0, new Error('boom'))).toBe(true)
    expect(retry(2, new Error('boom'))).toBe(false)
  })

  it('status 为 0 的网络错误不当成 4xx 处理', () => {
    const retry = retryPolicy()
    const network = new ApiError('NETWORK_ERROR', '连不上', 0, 'none')
    expect(retry(0, network)).toBe(true)
  })
})
