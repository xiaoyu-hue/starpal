// SPDX-License-Identifier: AGPL-3.0-or-later
import { DomainError } from '../../shared/errors.js'
import { requireObject, requireString } from '../../shared/validation.js'
import type { AdminTopicInput, TopicUpdateInput } from './topic.admin.types.js'

/**
 * 话题管理请求校验。约束与迁移 003 的 CHECK 对齐：
 * slug `^[a-z0-9]+(-[a-z0-9]+)*$`、中英文名非空；在服务层先拦一道，
 * 给出可读的 VALIDATION_FAILED，而不是让数据库约束冒成 500。
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

function parseSortOrder(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(num) || num < 0 || num > 100000) {
    throw new DomainError('VALIDATION_FAILED', '排序值须为 0..100000 的整数', [
      { field: 'sortOrder', constraint: '整数 0..100000' },
    ])
  }
  return num
}

function parseNullableText(raw: unknown, field: string, max: number): string | null {
  if (raw === undefined || raw === null) return null
  const text = requireString(raw, { field, min: 0, max, trim: true, allowInnerWhitespace: true })
  return text === '' ? null : text
}

function parseCommon(body: Record<string, unknown>, withSlug: boolean): AdminTopicInput {
  const slug = withSlug
    ? requireString(body.slug, {
        field: 'slug',
        min: 1,
        max: 64,
        trim: true,
        allowInnerWhitespace: false,
        pattern: SLUG_PATTERN,
        patternHint: '只能小写字母、数字、连字符，且不以连字符开头或结尾',
      })
    : ''
  const nameZh = requireString(body.nameZh, {
    field: 'nameZh',
    min: 1,
    max: 64,
    trim: true,
    allowInnerWhitespace: true,
  })
  const nameEn = requireString(body.nameEn, {
    field: 'nameEn',
    min: 1,
    max: 64,
    trim: true,
    allowInnerWhitespace: true,
  })
  return {
    slug,
    nameZh,
    nameEn,
    description: parseNullableText(body.description, 'description', 500),
    icon: parseNullableText(body.icon, 'icon', 64),
    sortOrder: parseSortOrder(body.sortOrder),
  }
}

export function parseCreateTopicInput(raw: unknown): AdminTopicInput {
  return parseCommon(requireObject(raw), true)
}

export function parseUpdateTopicInput(raw: unknown): TopicUpdateInput {
  const { slug: _slug, ...rest } = parseCommon(requireObject(raw), false)
  return rest
}

/** 归档请求体：{ archived: boolean }。 */
export function parseArchiveInput(raw: unknown): boolean {
  const body = requireObject(raw)
  if (typeof body.archived !== 'boolean') {
    throw new DomainError('VALIDATION_FAILED', 'archived 须为布尔值', [
      { field: 'archived', constraint: 'true（归档）或 false（恢复）' },
    ])
  }
  return body.archived
}

export function parseTopicId(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(num) || num < 1) throw new DomainError('NOT_FOUND', '话题不存在')
  return num
}
