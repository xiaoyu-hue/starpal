// SPDX-License-Identifier: AGPL-3.0-or-later
import { DomainError } from '../../shared/errors.js'

/**
 * 路径参数 `:id` 解析。
 *
 * 与帖子模块的同名函数口径一致（非法格式按资源不存在处理，不暴露路由格式细节），
 * 但不跨模块引用其内部文件——互动模块只依赖公共出口，避免模块边界被穿透。
 */
export function parsePostId(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(num) || num < 1) throw new DomainError('NOT_FOUND', '帖子不存在')
  return num
}
