// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PoolClient } from 'pg'
import { pool, withTransaction } from '../../db/pool.js'
import type { SecurityEventKind } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'

/** 认证相关数据访问。全部使用参数化查询，不拼接用户输入。 */

export type UserRow = {
  id: string
  username: string
  display_name: string
  password_hash: string
  role_id: number
  role_name: string
  status: string
  avatar_url: string | null
  created_at: Date
}

/** 按用户名取账户（含角色名）；已软删除的账户不参与登录。 */
export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT u.id, u.username, u.display_name, u.password_hash, u.role_id,
            r.name AS role_name, u.status, p.avatar_url, u.created_at
       FROM users u JOIN roles r ON r.id = u.role_id
       LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.username = $1 AND u.status <> 'deleted'`,
    [username],
  )
  return result.rows[0] ?? null
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT u.id, u.username, u.display_name, u.password_hash, u.role_id,
            r.name AS role_name, u.status, p.avatar_url, u.created_at
       FROM users u JOIN roles r ON r.id = u.role_id
       LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = $1 AND u.status <> 'deleted'`,
    [id],
  )
  return result.rows[0] ?? null
}

/**
 * 注册：在同一事务内插入用户、初始化资料行、写安全事件（架构 §5.8 事务边界）。
 * 用户名唯一性交给数据库 UNIQUE 约束；服务层捕获 23505 转换为 CONFLICT。
 */
export async function createUser(input: {
  username: string
  displayName: string
  passwordHash: string
  subjectHash: string
  /** 已勾选同意用户协议时写入版本与时间；未传则两列留空，不伪造同意记录。 */
  acceptedTermsVersion: string | null
  /** 邀请码哈希：注册事务内消费（标记 used 并绑定本用户），无效则整笔回滚，不会「码废号建成」。 */
  inviteCodeHash: string
}): Promise<{ id: string; username: string; displayName: string }> {
  return withTransaction(async (client: PoolClient) => {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO users (username, display_name, password_hash, terms_accepted_at, terms_version)
       VALUES ($1, $2, $3,
         CASE WHEN $4::text IS NULL THEN NULL ELSE now() END,
         $4::text)
       RETURNING id`,
      [input.username, input.displayName, input.passwordHash, input.acceptedTermsVersion],
    )
    const id = inserted.rows[0]!.id
    await client.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [id])
    await client.query(
      'INSERT INTO security_events (kind, subject_hash) VALUES ($1, $2)',
      ['register', input.subjectHash],
    )
    const consumed = await client.query(
      `UPDATE invite_codes SET status = 'used', used_by = $2, used_at = now()
        WHERE code_hash = $1 AND status = 'available' RETURNING id`,
      [input.inviteCodeHash, id],
    )
    if (consumed.rows.length === 0) {
      throw new DomainError('INVITE_INVALID', '邀请码无效或已被使用')
    }
    return { id, username: input.username, displayName: input.displayName }
  })
}

export async function updateLastLogin(userId: string): Promise<void> {
  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [userId])
}

// ── 会话 ────────────────────────────────────────────────────────────

export type SessionRow = {
  id: string
  user_id: string
  expires_at: Date
}

export async function insertSession(id: string, userId: string, expiresAt: Date): Promise<void> {
  await pool.query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [id, userId, expiresAt],
  )
}

/** 取有效会话；过期会话顺手删除，返回 null。 */
export async function findActiveSession(id: string): Promise<SessionRow | null> {
  const result = await pool.query<SessionRow>(
    'SELECT id, user_id, expires_at FROM sessions WHERE id = $1',
    [id],
  )
  const row = result.rows[0]
  if (!row) return null
  if (row.expires_at.getTime() <= Date.now()) {
    await deleteSession(id)
    return null
  }
  return row
}

export async function deleteSession(id: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE id = $1', [id])
}

// ── 安全事件与限流（Serverless 下必须落库，不能用进程内存计数） ────────

export async function recordEvent(kind: SecurityEventKind, subjectHash: string): Promise<void> {
  await pool.query(
    'INSERT INTO security_events (kind, subject_hash) VALUES ($1, $2)',
    [kind, subjectHash],
  )
}

/** 统计时间窗内某来源的某类事件数。 */
export async function countEvents(
  kind: SecurityEventKind,
  subjectHash: string,
  windowSeconds: number,
): Promise<number> {
  const result = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM security_events
      WHERE kind = $1 AND subject_hash = $2
        AND created_at > now() - ($3 * interval '1 second')`,
    [kind, subjectHash, windowSeconds],
  )
  return Number(result.rows[0]?.n ?? '0')
}

/**
 * 应用内按期清理：不引入外部调度服务（架构 §7.3）。
 * 在「记录事件」时顺带执行，随真实流量自然推进，避免冷启动额外定时任务。
 */
export async function pruneExpiredData(retentionDays: number): Promise<void> {
  await pool.query(
    `DELETE FROM security_events
      WHERE created_at < now() - ($1 * interval '1 day')`,
    [retentionDays],
  )
  await pool.query('DELETE FROM sessions WHERE expires_at <= now()')
}
