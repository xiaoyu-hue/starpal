// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { runPasswordChange } from '../../src/modules/auth/auth.repository.js'
import { hashPassword, verifyPassword } from '../../src/modules/auth/password.js'
import { createMigratedDb, seedUser } from '../helpers/db.js'

/**
 * 自助改密（M4 收尾补能力）。
 * 覆盖两个最容易写错、且直接影响账户安全的点：
 * 1. 口令哈希确实被换成新值（旧哈希失效）；
 * 2. 只撤销「其它」会话、保留当前会话——误删当前会话会让用户改完即掉线，
 *    漏删其它会话则等于改密不生效（旧会话仍可继续操作）。
 */
describe('自助改密：哈希更新与会话撤销', () => {
  let db: PGlite
  let executor: { query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> }

  const USER_ID = '1'
  const OLD_HASH = 'old-hash'
  const NEW_HASH = 'new-hash'

  before(async () => {
    db = await createMigratedDb()
    executor = { query: (sql, params) => db.query(sql, params) as never }
    await seedUser(db, 1, 'alice')
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [OLD_HASH, USER_ID])
  })

  after(async () => {
    await db.close()
  })

  /** 给同一用户预置若干会话，返回会话 id 列表。 */
  async function seedSessions(ids: string[]): Promise<void> {
    for (const id of ids) {
      await db.query(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval \'1 day\')',
        [id, USER_ID],
      )
    }
  }

  async function sessionIds(): Promise<string[]> {
    const result = await db.query<{ id: string }>(
      'SELECT id FROM sessions WHERE user_id = $1 ORDER BY id',
      [USER_ID],
    )
    return result.rows.map((row) => row.id)
  }

  async function passwordHash(): Promise<string> {
    const result = await db.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [USER_ID],
    )
    return result.rows[0]!.password_hash
  }

  it('前置：迁移后用户口令为旧哈希', async () => {
    assert.equal(await passwordHash(), OLD_HASH)
  })

  it('改密写入新哈希', async () => {
    await runPasswordChange(executor, {
      userId: USER_ID,
      passwordHash: NEW_HASH,
      keepSessionId: 'keep',
    })
    assert.equal(await passwordHash(), NEW_HASH)
  })

  it('只保留当前会话，其它会话被撤销', async () => {
    await seedSessions(['keep', 'other-a', 'other-b'])
    await runPasswordChange(executor, {
      userId: USER_ID,
      passwordHash: NEW_HASH,
      keepSessionId: 'keep',
    })
    assert.deepEqual(await sessionIds(), ['keep'])
  })

  it('不影响其它用户的会话', async () => {
    await seedUser(db, 2, 'bob')
    await db.query(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval \'1 day\')',
      ['bob-session', '2'],
    )
    await runPasswordChange(executor, {
      userId: USER_ID,
      passwordHash: NEW_HASH,
      keepSessionId: 'keep',
    })
    const result = await db.query<{ id: string }>(
      "SELECT id FROM sessions WHERE user_id = '2'",
    )
    assert.deepEqual(result.rows.map((row) => row.id), ['bob-session'])
  })

  it('Argon2id 哈希往返：新口令可验证、旧口令不可验证', async () => {
    const encoded = await hashPassword('correct horse battery staple')
    assert.equal(await verifyPassword('correct horse battery staple', encoded), true)
    assert.equal(await verifyPassword('wrong password', encoded), false)
  })

  it('损坏的哈希串返回 false 而非抛错', async () => {
    assert.equal(await verifyPassword('whatever', 'not-a-valid-phc-string'), false)
  })
})
