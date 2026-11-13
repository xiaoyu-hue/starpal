import { randomBytes } from 'node:crypto'
import type { PoolClient } from 'pg'
import { pool, withTransaction } from '../../db/pool.js'

/** 个人资料数据访问。全部参数化查询；可选资料字段白名单构建，禁止拼接用户输入。 */

export type ProfileRow = {
  id: string
  username: string
  display_name: string
  status: string
  avatar_url: string | null
  biography: string | null
  zodiac: string | null
  mbti: string | null
  age_band: string | null
  show_optional: boolean
  created_at: Date
}

/**
 * 公开投影取数：排除被停用的账户（status='suspended' 视为不存在），
 * 但保留已注销账户（status='deleted'）以便投影层替换为「已注销用户」。
 * 不选取 password_hash / role / 会话等任何内部字段。
 */
export async function findPublicProfileByUsername(
  username: string,
): Promise<ProfileRow | null> {
  const result = await pool.query<ProfileRow>(
    `SELECT u.id, u.username, u.display_name, u.status, p.avatar_url, p.biography,
            p.zodiac, p.mbti, p.age_band, p.show_optional, u.created_at
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.username = $1 AND u.status <> 'suspended'`,
    [username],
  )
  return result.rows[0] ?? null
}

/** 本人视角资料：含可选字段（不论 show_optional），用于设置页回填。 */
export async function findOwnProfileById(userId: string): Promise<ProfileRow | null> {
  const result = await pool.query<ProfileRow>(
    `SELECT u.id, u.username, u.display_name, u.status, p.avatar_url, p.biography,
            p.zodiac, p.mbti, p.age_band, p.show_optional, u.created_at
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = $1 AND u.status <> 'deleted'`,
    [userId],
  )
  return result.rows[0] ?? null
}

/** 资料更新：显示名落在 users 表，展示字段落在 user_profiles 表，同一事务内完成。 */
export type ProfileUpdateInput = {
  displayName?: string
  avatarUrl?: string | null
  biography?: string | null
  zodiac?: string | null
  mbti?: string | null
  ageBand?: string | null
  showOptional?: boolean
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<ProfileRow> {
  return withTransaction(async (client: PoolClient) => {
    if (input.displayName !== undefined) {
      await client.query('UPDATE users SET display_name = $1, updated_at = now() WHERE id = $2', [
        input.displayName,
        userId,
      ])
    }

    // 仅构建调用方实际提供的展示字段，未提供的保持原值（支持逐项清空）。
    const allowed = new Set([
      'avatarUrl',
      'biography',
      'zodiac',
      'mbti',
      'ageBand',
      'showOptional',
    ])
    const provided = Object.keys(input).filter((k) => allowed.has(k))
    if (provided.length > 0) {
      const sets: string[] = []
      const values: unknown[] = []
      let idx = 1
      for (const key of provided) {
        const column = KEY_TO_COLUMN[key]!
        sets.push(`${column} = $${idx}`)
        values.push((input as Record<string, unknown>)[key])
        idx += 1
      }
      sets.push(`updated_at = now()`)
      await client.query(
        `UPDATE user_profiles SET ${sets.join(', ')} WHERE user_id = $${idx}`,
        [...values, userId],
      )
    }

    const row = await client.query<ProfileRow>(
      `SELECT u.id, u.username, u.display_name, u.status, p.avatar_url, p.biography,
              p.zodiac, p.mbti, p.age_band, p.show_optional, u.created_at
         FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id = $1`,
      [userId],
    )
    return row.rows[0]!
  })
}

const KEY_TO_COLUMN: Record<string, string> = {
  avatarUrl: 'avatar_url',
  biography: 'biography',
  zodiac: 'zodiac',
  mbti: 'mbti',
  ageBand: 'age_band',
  showOptional: 'show_optional',
}

/** 吊销某用户的全部服务端会话（登出、删除、擦除时调用）。 */
export async function revokeSessions(userId: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
}

/**
 * 软删除：状态置 deleted、显示名改占位、清空资料、吊销会话。
 * 保留用户行与可见内容，署名由投影层替换为「已注销用户」（ADR-010）。
 */
export async function softDeleteUser(userId: string): Promise<void> {
  await withTransaction(async (client: PoolClient) => {
    await client.query(
      `UPDATE users SET status = 'deleted', deleted_at = now(),
              display_name = $1, updated_at = now() WHERE id = $2`,
      ['已注销用户', userId],
    )
    await client.query(
      `UPDATE user_profiles
          SET avatar_url = NULL, biography = NULL, zodiac = NULL, mbti = NULL,
              age_band = NULL, show_optional = false, updated_at = now()
        WHERE user_id = $1`,
      [userId],
    )
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId])
  })
}

/**
 * 彻底擦除：在软删除基础上清除可识别标识（用户名改唯一随机值）、记录擦除事件。
 * 帖子 / 图片等内容的擦除态在 M3 内容表落地后由对应服务补齐。
 */
export async function eraseUser(userId: string): Promise<void> {
  await withTransaction(async (client: PoolClient) => {
    await softDeleteInTx(client, userId)
    const placeholder = `erased_${randomBytes(8).toString('hex')}`
    await client.query('UPDATE users SET username = $1 WHERE id = $2', [
      placeholder,
      userId,
    ])
    await client.query(
      "INSERT INTO security_events (kind, subject_hash) VALUES ('account_erase', $1)",
      [`user:${userId}`],
    )
  })
}

async function softDeleteInTx(client: PoolClient, userId: string): Promise<void> {
  await client.query(
    `UPDATE users SET status = 'deleted', deleted_at = now(),
            display_name = $1, updated_at = now() WHERE id = $2`,
    ['已注销用户', userId],
  )
  await client.query(
    `UPDATE user_profiles
        SET avatar_url = NULL, biography = NULL, zodiac = NULL, mbti = NULL,
            age_band = NULL, show_optional = false, updated_at = now()
      WHERE user_id = $1`,
    [userId],
  )
  await client.query('DELETE FROM sessions WHERE user_id = $1', [userId])
}
