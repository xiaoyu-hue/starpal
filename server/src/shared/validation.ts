// SPDX-License-Identifier: AGPL-3.0-or-later
import { DomainError, type ErrorDetail } from './errors.js'
import { avatarSeedError, findAvatarStyle } from '../config/avatar-styles.js'

/**
 * 请求模式校验原语（架构 §5.7 模式层）。
 * 客户端校验仅用于体验，不得作为安全边界；所有准入判断必须经由此处。
 * 校验失败统一抛 VALIDATION_FAILED，附带字段级约束说明，由错误中间件归一化。
 */

type StringRule = {
  field: string
  min: number
  max: number
  pattern?: RegExp
  patternHint?: string
  /** 是否对首尾空白做归一化；用户名等标识符不允许空白。 */
  trim?: boolean
  /** 是否允许字符串内部含空白（密码允许，用户名不允许）。 */
  allowInnerWhitespace?: boolean
}

function invalid(details: ErrorDetail[]): never {
  throw new DomainError('VALIDATION_FAILED', '请求参数不合法', details)
}

/** 孤立代理项：UTF-16 里未配对的 \uD800-\uDFFF，无法编码为合法 UTF-8。 */
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

/**
 * 按 Unicode 码点计数，与 PostgreSQL `char_length` 同口径。
 * 不得使用 `String.length`：那是 UTF-16 码元数，一个 emoji 会算 2，
 * 导致「服务层判定超限、数据库却接受」或反过来的口径分裂。
 */
export function countChars(text: string): number {
  return Array.from(text).length
}

/** 校验字符串字段：类型、长度、字符集、首尾空白。返回归一化后的值。 */
export function requireString(value: unknown, rule: StringRule): string {
  if (typeof value !== 'string') {
    invalid([{ field: rule.field, constraint: '必须为字符串' }])
  }
  const raw = value as string
  const text = rule.trim ? raw.trim() : raw
  // 必须在长度判定之前拦截：孤立代理项一旦进入 SQL 参数，pg 编码阶段抛错会变成 500。
  if (LONE_SURROGATE.test(text)) {
    invalid([{ field: rule.field, constraint: '包含非法 Unicode 字符' }])
  }
  const length = countChars(text)
  if (length < rule.min || length > rule.max) {
    invalid([{ field: rule.field, constraint: `长度须在 ${rule.min}..${rule.max} 之间` }])
  }
  if (!rule.allowInnerWhitespace && /\s/.test(text)) {
    invalid([{ field: rule.field, constraint: '不得包含空白字符' }])
  }
  if (/^\s|\s$/.test(text)) {
    invalid([{ field: rule.field, constraint: '不得含首尾空白' }])
  }
  if (rule.pattern && !rule.pattern.test(text)) {
    invalid([{ field: rule.field, constraint: rule.patternHint ?? `须匹配 ${rule.pattern.source}` }])
  }
  return text
}

/** 请求体必须是普通对象（非数组、非 null）。 */
export function requireObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid([{ field: 'body', constraint: '请求体必须为 JSON 对象' }])
  }
  return value as Record<string, unknown>
}

/**
 * 校验可选字符串字段：蜜罐等辅助字段。
 * 蜜罐被填写时不报错、不区分提示，只返回命中标记，交由服务层静默丢弃。
 */
export function honeypotFilled(body: Record<string, unknown>, field: string): boolean {
  const value = body[field]
  return typeof value === 'string' && value.trim() !== ''
}

/** 枚举校验。 */
export function requireEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    invalid([{ field, constraint: `取值须为 ${allowed.join(' | ')}` }])
  }
  return value as T
}

/** 布尔校验：仅接受 JSON 布尔，不接受 'true' 字符串等弱类型。 */
export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    invalid([{ field, constraint: '必须为布尔值' }])
  }
  return value as boolean
}

/**
 * 头像链接校验：仅接受 http(s) 绝对地址，长度受限。
 * 不发起网络请求、不探测可达性——可达性由前端与 M3 图片管线负责。
 */
export function requireHttpUrl(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') {
    invalid([{ field, constraint: '必须为字符串' }])
  }
  const text = value as string
  if (text.length > max) {
    invalid([{ field, constraint: `长度须不超过 ${max}` }])
  }
  let parsed: URL
  try {
    parsed = new URL(text)
  } catch {
    invalid([{ field, constraint: '须为合法的 URL' }])
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    invalid([{ field, constraint: '仅支持 http / https 链接' }])
  }
  return text
}

/**
 * 头像地址校验（头像功能专用）。
 *
 * 接受两类值：
 * 1. 外链 http(s) 绝对路径——兼容此前已填外链的老用户，不打断其现有头像；
 * 2. 站内生成路径 `/api/avatars/{已登记风格}?seed={合法种子}`——本功能新写入的格式。
 *
 * 站内路径严格校验：风格必须在白名单、种子必须符合规则、不得带额外路径段或哈希。
 * 这样既让前端能直接把结果放进 <img src>，又不给路径穿越 / 注入留口子。
 */
export function requireAvatarUrl(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') {
    invalid([{ field, constraint: '必须为字符串' }])
  }
  const text = value as string
  if (text.length > max) {
    invalid([{ field, constraint: `长度须不超过 ${max}` }])
  }
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return requireHttpUrl(text, field, max)
  }
  if (!text.startsWith('/api/avatars/')) {
    invalid([{ field, constraint: '头像须为 http(s) 链接或站内预设头像' }])
  }
  let parsed: URL
  try {
    parsed = new URL(text, 'https://starpal.invalid')
  } catch {
    invalid([{ field, constraint: '头像地址格式不正确' }])
  }
  const slug = decodeURIComponent(parsed.pathname.slice('/api/avatars/'.length))
  if (slug.includes('/') || findAvatarStyle(slug) === undefined) {
    invalid([{ field, constraint: '不支持的头像风格' }])
  }
  const seed = parsed.searchParams.get('seed') ?? ''
  const seedError = avatarSeedError(seed)
  if (seedError !== null) {
    invalid([{ field, constraint: seedError }])
  }
  // 归一化：只保留规定的查询参数与路径，杜绝夹带 hash / 多余参数。
  return `/api/avatars/${encodeURIComponent(slug)}?seed=${encodeURIComponent(seed)}`
}
