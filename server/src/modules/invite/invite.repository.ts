// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes, createHmac } from 'node:crypto'
import { pool, withTransaction } from '../../db/pool.js'
import { appEnv } from '../../config/env.js'

/**
 * 邀请码持久化层。
 *
 * 设计要点：
 * - 明文不入库，只存 HMAC-SHA256 哈希，与登录口令同口径的密钥派生；库泄露也无法还原明文。
 * - 状态机：available → used（注册消费）或 revoked（运营者撤销）；used / revoked 都不可再被使用。
 * - 生成时一次返回明文给运营者，此后永不返回——和「一次性密码」同一思路。
 * - 消费方在注册事务内直接 UPDATE（见 auth.repository），本层不提供消费函数，避免两套入口。
 */

/** Crockford Base32：剔除 I L O U 与易混字符，避免手抄邀请码出错。 */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function toBase32(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31]
  return out
}

/** 邀请码 → 哈希，注册校验与入库都走这一道，保证比对的是同一派生值。 */
export function hashInviteCode(plain: string): string {
  return createHmac('sha256', appEnv.sessionSecret).update(plain).digest('hex')
}

export type InviteCodeRow = {
  id: number
  note: string | null
  status: string
  createdBy: string | null
  createdByUsername: string | null
  usedBy: string | null
  usedByUsername: string | null
  usedAt: string | null
  revokedAt: string | null
  createdAt: string
}

const LIST_SELECT = `
  SELECT ic.id, ic.note, ic.status, ic.created_at, ic.used_at, ic.revoked_at,
         ic.created_by, cu.username AS created_by_username,
         ic.used_by, uu.username AS used_by_username
  FROM invite_codes ic
  LEFT JOIN users cu ON cu.id = ic.created_by
  LEFT JOIN users uu ON uu.id = ic.used_by
  ORDER BY ic.created_at DESC, ic.id DESC
`

function mapRow(row: Record<string, unknown>): InviteCodeRow {
  return {
    id: Number(row.id),
    note: (row.note as string | null) ?? null,
    status: String(row.status),
    createdBy: row.created_by === null ? null : String(row.created_by),
    createdByUsername: (row.created_by_username as string | null) ?? null,
    usedBy: row.used_by === null ? null : String(row.used_by),
    usedByUsername: (row.used_by_username as string | null) ?? null,
    usedAt: row.used_at ? (row.used_at as Date).toISOString() : null,
    revokedAt: row.revoked_at ? (row.revoked_at as Date).toISOString() : null,
    createdAt: (row.created_at as Date).toISOString(),
  }
}

/** 批量生成：明文仅此次返回给运营者，库内只存哈希，code_hash 唯一约束防碰撞。 */
export async function generateInviteCodes(
  count: number,
  createdBy: string,
  note?: string,
): Promise<string[]> {
  const plains: string[] = []
  const hashes: string[] = []
  for (let i = 0; i < count; i++) {
    const plain = toBase32(randomBytes(7))
    plains.push(plain)
    hashes.push(hashInviteCode(plain))
  }
  await withTransaction(async (client) => {
    for (let i = 0; i < count; i++) {
      await client.query(
        'INSERT INTO invite_codes (code_hash, note, created_by) VALUES ($1, $2, $3)',
        [hashes[i], note ?? null, createdBy],
      )
    }
  })
  return plains
}

export async function listInviteCodes(): Promise<InviteCodeRow[]> {
  const result = await pool.query(LIST_SELECT)
  return (result.rows as Record<string, unknown>[]).map(mapRow)
}

/** 撤销：仅 available → revoked，已用 / 已撤不动，返回受影响行数（0 表示不可撤销）。 */
export async function revokeInviteCode(id: number): Promise<number> {
  const result = await pool.query(
    `UPDATE invite_codes SET status = 'revoked', revoked_at = now()
      WHERE id = $1 AND status = 'available'`,
    [id],
  )
  return result.rowCount ?? 0
}
