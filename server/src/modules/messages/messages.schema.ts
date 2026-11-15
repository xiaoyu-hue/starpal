// SPDX-License-Identifier: AGPL-3.0-or-later
import { FEED_MAX_PAGE_SIZE, FEED_PAGE_SIZE } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { decodeCursor, type CursorPayload } from '../../shared/pagination.js'
import { requireString } from '../../shared/validation.js'

/**
 * 私信请求模式层：准入判断集中于此，控制器只做「解析 → 服务 → 统一包络」。
 * 私信均为登录态操作，校验失败一律 VALIDATION_FAILED（或收件人非法时由服务层转）。
 */

/** 单条消息正文上限（字符，按 Unicode 码点计，与数据库 char_length 同口径）。 */
export const MESSAGE_BODY_MAX = 2000

/** 收件人用户名：复用与注册一致的标识符约束（非空、不含空白）。 */
export function parseUsername(raw: unknown): string {
  return requireString(raw, { field: 'username', min: 1, max: 40, trim: true })
}

/** 消息正文：非空、长度受限、首尾空白归一。 */
export function parseMessageBody(raw: unknown): string {
  return requireString(raw, { field: 'body', min: 1, max: MESSAGE_BODY_MAX, trim: true })
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

/** 会话列表 / 消息列表共用的分页入参（游标基于「活动时间 + id」或「发送时间 + id」）。 */
export type ListQuery = { limit: number; cursor: CursorPayload | null }

export function parseListQuery(query: Record<string, unknown>): ListQuery {
  return { limit: parseLimit(query.limit), cursor: parseCursor(query.cursor) }
}
