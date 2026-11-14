import {
  COMMENT_BODY_MAX,
  COMMENT_BODY_MIN,
  COMMENT_MAX_PAGE_SIZE,
  COMMENT_PAGE_SIZE,
} from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { decodeCursor, type CursorPayload } from '../../shared/pagination.js'
import { requireObject, requireString } from '../../shared/validation.js'

/**
 * 评论请求模式层。
 *
 * 与帖子模块的同名解析函数口径一致，但不跨模块引用其内部文件——模块之间只经
 * 公共出口通信，避免边界被穿透（`interactions` 亦遵循同一约定）。
 */

export type CreateCommentInput = {
  body: string
}

export type CommentQuery = {
  cursor: CursorPayload | null
  limit: number
}

/** 路径参数：非法格式按资源不存在处理，不暴露路由格式细节。 */
export function parsePostId(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(num) || num < 1) throw new DomainError('NOT_FOUND', '帖子不存在')
  return num
}

export function parseCommentId(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(num) || num < 1) throw new DomainError('NOT_FOUND', '评论不存在')
  return num
}

/** 正文是自然语言：允许换行与内部空白，仅归一化首尾空白，空内容由长度下限拦截。 */
export function parseCreateInput(raw: unknown): CreateCommentInput {
  const body = requireObject(raw)
  const text = requireString(body.body, {
    field: 'body',
    min: COMMENT_BODY_MIN,
    max: COMMENT_BODY_MAX,
    trim: true,
    allowInnerWhitespace: true,
  })
  return { body: text }
}

function parseLimit(raw: unknown): number {
  if (raw === undefined) return COMMENT_PAGE_SIZE
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > COMMENT_MAX_PAGE_SIZE) {
    throw new DomainError('VALIDATION_FAILED', 'limit 参数超出允许范围', [
      { field: 'limit', constraint: `1..${COMMENT_MAX_PAGE_SIZE}` },
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

export function parseCommentQuery(query: Record<string, unknown>): CommentQuery {
  return { cursor: parseCursor(query.cursor), limit: parseLimit(query.limit) }
}
