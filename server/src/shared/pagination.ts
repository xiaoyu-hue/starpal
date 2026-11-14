// SPDX-License-Identifier: AGPL-3.0-or-later
/** 游标编码/解码：仅承载排序键与主键，不透明给客户端。 */
export type CursorPayload = { t: string; id: string }

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (typeof parsed !== 'object' || parsed === null) return null
    const value = parsed as Partial<CursorPayload>
    if (typeof value.t !== 'string' || typeof value.id !== 'string') return null
    return { t: value.t, id: value.id }
  } catch {
    return null
  }
}
