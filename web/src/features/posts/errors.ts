import { ApiError } from '../../lib/api-client'

/**
 * 把领域错误翻译成一句可读的中文。
 * 校验失败时优先展示字段级约束：服务端的 details 比笼统的「请求参数不正确」更有用。
 */
export function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.details && error.details.length > 0) {
      return error.details.map((item) => `${item.field}：${item.constraint}`).join('；')
    }
    return error.message
  }
  return fallback
}
