// SPDX-License-Identifier: AGPL-3.0-or-later
import { REPORT_MAX_PAGE_SIZE, REPORT_PAGE_SIZE } from '../../config/report-constants.js'
import { DomainError } from '../../shared/errors.js'
import { decodeCursor, type CursorPayload } from '../../shared/pagination.js'
import { requireEnum, requireObject } from '../../shared/validation.js'
import type { ContentStatusTarget, UserStatusTarget } from './admin.types.js'

/**
 * 管理端请求模式层：所有准入判断集中于此，控制器只做「解析 → 服务 → 包络」。
 * 分页口径复用举报模块常量（同为运营列表），不另起一套数字真源。
 */

export type AdminListQuery = { cursor: CursorPayload | null; limit: number }

export function parseAdminListQuery(query: Record<string, unknown>): AdminListQuery {
  let cursor: CursorPayload | null = null
  if (query.cursor !== undefined && query.cursor !== '') {
    const value = typeof query.cursor === 'string' ? query.cursor : ''
    const decoded = value === '' ? null : decodeCursor(value)
    if (decoded === null) {
      throw new DomainError('VALIDATION_FAILED', 'cursor 参数格式非法', [
        { field: 'cursor', constraint: 'base64url 编码的游标' },
      ])
    }
    cursor = decoded
  }

  let limit = REPORT_PAGE_SIZE
  if (query.limit !== undefined && query.limit !== '') {
    const value = Number(query.limit)
    if (!Number.isInteger(value) || value < 1 || value > REPORT_MAX_PAGE_SIZE) {
      throw new DomainError('VALIDATION_FAILED', 'limit 参数超出允许范围', [
        { field: 'limit', constraint: `1..${REPORT_MAX_PAGE_SIZE}` },
      ])
    }
    limit = value
  }
  return { cursor, limit }
}

/** 路径参数 :id：非法格式按资源不存在处理，不暴露路由细节。 */
export function parseAdminId(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(num) || num < 1) throw new DomainError('NOT_FOUND', '资源不存在')
  return num
}

/** 内容种类路径参数：posts / comments → 内部单数 kind。 */
export function parseContentKind(raw: unknown): 'post' | 'comment' {
  if (raw === 'posts') return 'post'
  if (raw === 'comments') return 'comment'
  throw new DomainError('NOT_FOUND', '内容类型不存在')
}

const USER_TARGETS = ['suspended', 'active'] as const
const CONTENT_TARGETS = ['removed', 'published'] as const

/** 用户状态变更请求体：只允许停用 / 恢复，注销态不接受。 */
export function parseUserStatusTarget(raw: unknown): UserStatusTarget {
  const body = requireObject(raw)
  return requireEnum<UserStatusTarget>(body.status, 'status', USER_TARGETS)
}

/** 内容状态变更请求体：只允许移除 / 恢复。 */
export function parseContentStatusTarget(raw: unknown): ContentStatusTarget {
  const body = requireObject(raw)
  return requireEnum<ContentStatusTarget>(body.status, 'status', CONTENT_TARGETS)
}
