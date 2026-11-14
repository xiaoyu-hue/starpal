// SPDX-License-Identifier: AGPL-3.0-or-later
import { FEED_MAX_PAGE_SIZE, FEED_PAGE_SIZE, SEARCH_TERM_MAX } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { decodeCursor, type CursorPayload } from '../../shared/pagination.js'

/**
 * 搜索请求模式层：所有准入判断集中于此，控制器只做「解析 → 服务 → 统一包络」。
 * 空关键词不报错——由服务层短路返回空结果，让前端走明确空态而非 4xx。
 */

export const SEARCH_TYPES = ['all', 'post', 'topic'] as const
export type SearchType = (typeof SEARCH_TYPES)[number]

export type SearchQuery = {
  /** 已 trim 的关键词；为空表示不检索（服务层短路）。 */
  q: string
  /** 检索范围：all=标题/正文/话题名，post=标题/正文，topic=话题名。 */
  type: SearchType
  limit: number
  cursor: CursorPayload | null
}

function parseTerm(raw: unknown): string {
  if (raw === undefined) return ''
  if (typeof raw !== 'string') {
    throw new DomainError('VALIDATION_FAILED', 'q 参数格式非法', [
      { field: 'q', constraint: '字符串' },
    ])
  }
  const trimmed = raw.trim()
  // 超长直接拒绝，不静默截断：截断会得到用户未预期的结果集。
  if (trimmed.length > SEARCH_TERM_MAX) {
    throw new DomainError('VALIDATION_FAILED', `关键词过长（上限 ${SEARCH_TERM_MAX} 字）`, [
      { field: 'q', constraint: `长度 ≤ ${SEARCH_TERM_MAX}` },
    ])
  }
  return trimmed
}

function parseType(raw: unknown): SearchType {
  // 缺省 all：不带参数也应可用，覆盖「一次搜全部」的常见预期。
  if (raw === undefined) return 'all'
  const value = typeof raw === 'string' ? raw : ''
  if (!SEARCH_TYPES.includes(value as SearchType)) {
    throw new DomainError('VALIDATION_FAILED', 'type 参数必须是 all / post / topic', [
      { field: 'type', constraint: `enum: ${SEARCH_TYPES.join(' | ')}` },
    ])
  }
  return value as SearchType
}

function parseLimit(raw: unknown): number {
  if (raw === undefined) return FEED_PAGE_SIZE
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > FEED_MAX_PAGE_SIZE) {
    throw new DomainError('VALIDATION_FAILED', 'limit 参数超出允许范围', [
      { field: 'limit', constraint: `1..${FEED_MAX_PAGE_SIZE}` },
    ])
  }
  return value
}

function parseCursor(raw: unknown): CursorPayload | null {
  if (raw === undefined) return null
  const value = typeof raw === 'string' ? raw : ''
  if (value === '') return null
  const decoded = decodeCursor(value)
  if (decoded === null) {
    throw new DomainError('VALIDATION_FAILED', 'cursor 参数格式非法', [
      { field: 'cursor', constraint: 'base64url 编码的游标' },
    ])
  }
  return decoded
}

export function parseSearchQuery(query: Record<string, unknown>): SearchQuery {
  return {
    q: parseTerm(query.q),
    type: parseType(query.type),
    limit: parseLimit(query.limit),
    cursor: parseCursor(query.cursor),
  }
}
