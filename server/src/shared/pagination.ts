// SPDX-License-Identifier: AGPL-3.0-or-later
/** 游标编码/解码：仅承载排序键与主键，不透明给客户端。 */
export type CursorPayload = { t: string; id: string }

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

/**
 * 排序键 `t` 的合法性：两种游标语义都要放行——
 * - 时间键（latest / 评论 / 通知 / 管理 / 搜索 / 私信）：ISO 时间串，Date.parse 为有限值；
 * - 权重分键（popular / 推荐）：`rank_score` 是浮点数，String() 后为有限数字串（含科学计数）。
 * 只放行这两类，阻断 `x` 之类畸形值进入 SQL 的 ::timestamptz / ::double precision（攻防 B1–B5）。
 */
function isValidSortKey(t: string): boolean {
  return Number.isFinite(Date.parse(t)) || (t.trim() !== '' && Number.isFinite(Number(t)))
}

/**
 * 主键 `id` 的合法性：正整数字符串，且不超过 PostgreSQL bigint 上限。
 * 用 BigInt 比较避免 `Number('999...')` 溢出成 Infinity 后仍被当有效值（攻防 B6）。
 */
function isValidId(id: string): boolean {
  if (!/^\d+$/.test(id)) return false
  const big = BigInt(id)
  return big > 0n && big <= 9223372036854775807n
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (typeof parsed !== 'object' || parsed === null) return null
    const value = parsed as Partial<CursorPayload>
    if (typeof value.t !== 'string' || typeof value.id !== 'string') return null
    // 校验内容而非仅类型：畸形游标在此回落 null，由调用方统一转 400，
    // 避免非法值进入 SQL 类型转换触发 500（第一轮 P4 只修了通知，此处推广到全部调用方）。
    if (!isValidSortKey(value.t) || !isValidId(value.id)) return null
    return { t: value.t, id: value.id }
  } catch {
    return null
  }
}
