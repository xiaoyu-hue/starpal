// SPDX-License-Identifier: AGPL-3.0-or-later
import { ApiError } from '../../lib/api-client'

/**
 * 把私信域的错误翻成一句可读中文。
 *
 * 刻意在本域内保留一份小实现，而不是跨域引用 posts 的内部工具：
 * 特性边界规则（lint R1）要求跨域只能走公共出口，而 posts 的 barrel
 * 是按页面分包组织的，不该为一个 8 行的格式化函数把页面依赖带进私信分包。
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
