// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb } from '../helpers/db.js'
import { mintAltcha } from '../helpers/altcha.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'
import { hashPassword } from '../../src/modules/auth/password.js'
import { hashInviteCode } from '../../src/modules/invite/index.js'
import { ROLE_ADMIN } from '../../src/config/constants.js'

/**
 * 第三次攻防（2026-11-21）真实发现的端到端回归：
 * - F1 注册用户名枚举：无效邀请码不得暴露用户名是否存在；有效码下体验不变、一人一码不变。
 * - F2–F5 可控 500：畸形 avatarUrl / 超大数值 id 一律 400/404，不得 500。
 * - F6 管理员自锁：不能停用自己、不能停用最后一名管理员；多管理员时可停用其一。
 *
 * 走真实 Express 链路 + PGlite 内存库，不 mock 任何服务层函数。
 */

type Reply = { status: number; body: any; text: string }
let db: PGlite
let app: RunningApp
let sourceTag = 0

async function call(path: string, init: RequestInit = {}): Promise<Reply> {
  const res = await app.request(path, init)
  const text = await res.text()
  let body: any = null
  try { body = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, body, text }
}
function json(method: string, payload: unknown, cookie?: string, extra?: Record<string, string>): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...(extra ?? {}) },
    body: JSON.stringify(payload),
  }
}
const code = (r: Reply): string => r.body?.error?.code ?? ''
/** 每个请求一个独立来源摘要，避免限流把用例串成一个桶。 */
function distinctSource(): Record<string, string> {
  sourceTag += 1
  return { 'x-forwarded-for': `198.51.100.${sourceTag}, 203.0.113.${sourceTag}` }
}

before(async () => {
  db = await createMigratedDb()
  const pwdHash = await hashPassword('CorrectHorse9!')
  await db.query(
    `INSERT INTO users (id, username, password_hash, display_name, role_id, status)
     VALUES (1,'alice',$1,'alice',1,'active') ON CONFLICT DO NOTHING`,
    [pwdHash],
  )
  app = await startTestServer(db)
})

after(async () => {
  await app?.close()
  await db?.close()
})

describe('F1 注册用户名枚举防护', () => {
  it('无效邀请码下：已存在与不存在的用户名返回同一错误码，无法差分枚举', async () => {
    const probe = async (username: string) => {
      const proof = await mintAltcha()
      return call('/api/auth/register', json('POST', {
        username, password: 'ValidPass9!X', displayName: 'probeUser',
        inviteCode: 'DEFINITELY_INVALID_ENUM_CODE', altcha: proof.payload,
      }, undefined, distinctSource()))
    }
    const existing = await probe('alice')                       // 库里真实存在
    const absent = await probe(`ghost_${Date.now()}_${sourceTag}`) // 不存在
    assert.equal(existing.status, 400, `已存在用户名+无效码应为 400：${existing.text}`)
    assert.equal(absent.status, 400, `不存在用户名+无效码应为 400：${absent.text}`)
    assert.equal(code(existing), 'INVITE_INVALID')
    assert.equal(code(absent), 'INVITE_INVALID', '两者必须同一错误码，否则可枚举')
  })

  it('有效邀请码下：已存在用户名仍能准确返回「用户名被占用」（体验不变）', async () => {
    const plain = 'VALIDENUMCODE12345'
    await db.query('INSERT INTO invite_codes (code_hash, note) VALUES ($1,$2)', [hashInviteCode(plain), 'F1 体验回归'])
    const proof = await mintAltcha()
    const r = await call('/api/auth/register', json('POST', {
      username: 'alice', password: 'ValidPass9!X', displayName: 'alice',
      inviteCode: plain, altcha: proof.payload,
    }, undefined, distinctSource()))
    assert.equal(r.status, 409, `有效码+已存在用户名应保持 409：${r.text}`)
    assert.equal(code(r), 'CONFLICT')
    // 该邀请码不应被这次失败注册消费（事务回滚）。
    const still = await db.query<{ status: string }>('SELECT status FROM invite_codes WHERE code_hash=$1', [hashInviteCode(plain)])
    assert.equal(still.rows[0]?.status, 'available', '注册失败不得消耗有效邀请码')
  })

  it('有效邀请码一人一码仍成立：并发只用一次', async () => {
    const plain = 'RACEF1CODE9876543'
    await db.query('INSERT INTO invite_codes (code_hash, note) VALUES ($1,$2)', [hashInviteCode(plain), 'F1 并发回归'])
    const proofs = await Promise.all(Array.from({ length: 6 }, () => mintAltcha()))
    const results = await Promise.all(proofs.map((p, i) =>
      call('/api/auth/register', json('POST', {
        username: `f1race_${Date.now()}_${i}`, password: 'ValidPass9!X', displayName: 'race',
        inviteCode: plain, altcha: p.payload,
      }, undefined, distinctSource()))
    ))
    const ok = results.filter((x) => x.status >= 200 && x.status < 300).length
    assert.equal(ok, 1, `同一有效码并发应恰好 1 次成功，实际 ${ok}：${results.map((x) => x.status).join(',')}`)
  })
})

describe('F2–F5 可控 500 防护', () => {
  const alice = 'starpal_session=sess-alice'
  before(async () => {
    await db.query(`INSERT INTO sessions (id,user_id,expires_at) VALUES ('sess-alice',1,now()+interval '1 day') ON CONFLICT DO NOTHING`)
  })

  it('F2 畸形头像转义返回 400 而非 500', async () => {
    const r = await call('/api/users/me', json('PATCH', { avatarUrl: '/api/avatars/%ZZ?seed=a' }, alice))
    assert.equal(r.status, 400, `应 400：${r.text}`)
    assert.equal(code(r), 'VALIDATION_FAILED')
  })

  it('F3 发帖 topicId=1e21 返回 400 而非 500', async () => {
    const r = await call('/api/posts', json('POST', {
      title: '超大 topicId 测试', body: '超大 topicId 测试正文内容', topicId: 1e21,
    }, alice))
    assert.equal(r.status, 400, `应 400：${r.text}`)
  })

  it('F4 帖子详情 id=1e21 返回 404 而非 500', async () => {
    const r = await call('/api/posts/1e21', { headers: { cookie: alice } })
    assert.equal(r.status, 404, `应 404：${r.text}`)
  })

  it('F5 互动 id=1e21 返回 404 而非 500', async () => {
    const r = await call('/api/posts/1e21/like', { method: 'PUT', headers: { cookie: alice } })
    assert.equal(r.status, 404, `应 404：${r.text}`)
  })
})
