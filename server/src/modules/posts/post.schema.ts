// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  FEED_MAX_PAGE_SIZE,
  FEED_PAGE_SIZE,
  FEED_TABS,
  POST_BODY_MAX,
  POST_BODY_MIN,
  POST_TITLE_MAX,
  type FeedTab,
} from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { decodeCursor, type CursorPayload } from '../../shared/pagination.js'
import { requireObject, requireString } from '../../shared/validation.js'

/**
 * 帖子请求模式层（架构 §5.7）：
 * 所有准入判断集中于此，控制器只做「解析 → 调用服务 → 统一包络」。
 * 客户端校验仅为体验，不构成安全边界。
 */

export type CreatePostInput = {
  title: string
  body: string
  topicId: number
}

export type UpdatePostInput = {
  title?: string
  body?: string
  topicId?: number
}

export type FeedQuery = {
  tab: FeedTab
  limit: number
  cursor: CursorPayload | null
  /** 可选话题筛选；同时作为推荐流的显式话题亲和度来源。 */
  topicSlug: string | null
}

function parsePositiveInt(value: unknown, field: string): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(num) || num < 1) {
    throw new DomainError('VALIDATION_FAILED', `${field} 必须为正整数`, [
      { field, constraint: '正整数' },
    ])
  }
  return num
}

/** 路径参数 `:id`：非法格式按资源不存在处理，不暴露路由格式细节。 */
export function parsePostId(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(num) || num < 1) throw new DomainError('NOT_FOUND', '帖子不存在')
  return num
}

function parseTitle(value: unknown): string {
  // 标题是自然语言：允许内部空格（「M3 前端 内容域」是正常写法）。
  return requireString(value, {
    field: 'title',
    min: 1,
    max: POST_TITLE_MAX,
    trim: true,
    allowInnerWhitespace: true,
  })
}

function parseBody(value: unknown): string {
  // 正文允许内部换行与空白（段落结构即内容），仅归一化首尾空白；空正文由长度下限拦截。
  return requireString(value, {
    field: 'body',
    min: POST_BODY_MIN,
    max: POST_BODY_MAX,
    trim: true,
    allowInnerWhitespace: true,
  })
}

export function parseCreateInput(raw: unknown): CreatePostInput {
  const body = requireObject(raw)
  return {
    title: parseTitle(body.title),
    body: parseBody(body.body),
    topicId: parsePositiveInt(body.topicId, 'topicId'),
  }
}

/** 编辑：仅处理调用方实际提供的字段，未提供者保持原值。 */
export function parseUpdateInput(raw: unknown): UpdatePostInput {
  const body = requireObject(raw)
  const input: UpdatePostInput = {}
  if ('title' in body) input.title = parseTitle(body.title)
  if ('body' in body) input.body = parseBody(body.body)
  if ('topicId' in body) input.topicId = parsePositiveInt(body.topicId, 'topicId')
  if (Object.keys(input).length === 0) {
    throw new DomainError('VALIDATION_FAILED', '请求体未包含可修改字段', [
      { field: 'body', constraint: '至少提供 title / body / topicId 之一' },
    ])
  }
  return input
}

function parseTab(raw: unknown): FeedTab {
  // 缺省按「最新」处理：列表端点不带参数也应可用，显式传参时行为不变。
  if (raw === undefined) return 'latest'
  const value = typeof raw === 'string' ? raw : ''
  if (!FEED_TABS.includes(value as FeedTab)) {
    throw new DomainError('VALIDATION_FAILED', 'tab 参数必须是 recommended / latest / popular', [
      { field: 'tab', constraint: `enum: ${FEED_TABS.join(' | ')}` },
    ])
  }
  return value as FeedTab
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

function parseTopicSlug(raw: unknown): string | null {
  if (raw === undefined) return null
  if (typeof raw !== 'string' || raw === '') {
    throw new DomainError('VALIDATION_FAILED', 'topic 参数格式非法', [
      { field: 'topic', constraint: '话题 slug，例如 gaming' },
    ])
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw) || raw.length > 64) {
    throw new DomainError('VALIDATION_FAILED', 'topic 参数格式非法', [
      { field: 'topic', constraint: '小写字母、数字与连字符，长度 ≤ 64' },
    ])
  }
  return raw
}

export function parseFeedQuery(query: Record<string, unknown>): FeedQuery {
  return {
    tab: parseTab(query.tab),
    limit: parseLimit(query.limit),
    cursor: parseCursor(query.cursor),
    topicSlug: parseTopicSlug(query.topic),
  }
}
