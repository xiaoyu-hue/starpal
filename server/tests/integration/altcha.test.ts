// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { mintAltcha } from '../helpers/altcha.js'
import { createMigratedDb } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'
import { hashInviteCode } from '../../src/modules/invite/index.js'

/**
 * 人机验证（ALTCHA 自托管）真实链路测试。
 *
 * 覆盖守卫的所有拒绝分支与一次性防重放；每份载荷都由测试夹具真实求解，
 * 与浏览器 widget 提交的东西同构——不放后门开关，测的就是生产那条校验路径。
 */
let db: PGlite
let app: RunningApp
let inviteCode = ''

async function call(path: string, init: RequestInit = {}): Promise<{
  status: number
  body: Record<string, unknown> | null
  text: string
}> {
  const res = await app.request(path, init)
  const text = await res.text()
  let body: Record<string, unknown> | null = null
  try {
    body = JSON.parse(text) as Record<string, unknown>
  } catch {
    body = null
  }
  return { status: res.status, body, text }
}

function registerBody(altcha?: string): Record<string, unknown> {
  return {
    username: 'captcha_user',
    password: 'CaptchaPass123!',
    displayName: '验证用户',
    inviteCode,
    acceptTerms: true,
    ...(altcha !== undefined ? { altcha } : {}),
  }
}

function postJson(payload: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

before(async () => {
  db = await createMigratedDb()
  inviteCode = 'CAPTCHAKEY123456ABCD'
  await db.query('INSERT INTO invite_codes (code_hash, note) VALUES ($1, $2)', [
    hashInviteCode(inviteCode),
    '人机验证测试',
  ])
  app = await startTestServer(db)
})

after(async () => {
  await app.close()
  await db.close()
})

describe('ALTCHA 人机验证', () => {
  it('GET /api/auth/challenge 返回可供 widget 消费的挑战 JSON', async () => {
    const reply = await call('/api/auth/challenge')
    assert.equal(reply.status, 200, reply.text.slice(0, 200))
    const challengeText = (reply.body?.data as { challenge?: string })?.challenge
    assert.ok(challengeText, '响应应含 challenge 字段')
    const parsed = JSON.parse(challengeText) as {
      parameters: { algorithm: string; expiresAt?: number }
    }
    assert.equal(parsed.parameters.algorithm, 'PBKDF2/SHA-256')
    assert.ok(parsed.parameters.expiresAt, '挑战应自带过期时间')
  })

  it('缺少验证载荷时注册被拒，且不创建用户', async () => {
    const reply = await call('/api/auth/register', postJson(registerBody()))
    assert.equal(reply.status, 400, reply.text.slice(0, 200))
    assert.equal((reply.body as { error?: { code?: string } })?.error?.code, 'CHALLENGE_INVALID')
    const users = await db.query('SELECT id FROM users WHERE username = $1', ['captcha_user'])
    assert.equal(users.rows.length, 0, '验证失败不应写入用户')
  })

  it('畸形载荷被拒（base64 解不出 JSON）', async () => {
    const reply = await call('/api/auth/register', postJson(registerBody('not-valid-base64!!!')))
    assert.equal(reply.status, 400, reply.text.slice(0, 200))
    assert.equal((reply.body as { error?: { code?: string } })?.error?.code, 'CHALLENGE_INVALID')
  })

  it('有效载荷放行注册，同一载荷再次提交被拒（防重放）', async () => {
    const proof = await mintAltcha()
    const first = await call('/api/auth/register', postJson(registerBody(proof.payload)))
    assert.equal(first.status, 200, first.text.slice(0, 300))
    assert.equal((first.body?.data as { registered?: boolean })?.registered, true)

    // 换一个未注册的用户名，但复用同一载荷——应被一次性消费挡下。
    const replayBody = { ...registerBody(proof.payload), username: 'captcha_replay' }
    const replay = await call('/api/auth/register', postJson(replayBody))
    assert.equal(replay.status, 400, replay.text.slice(0, 200))
    assert.equal((replay.body as { error?: { code?: string } })?.error?.code, 'CHALLENGE_INVALID')
    const users = await db.query('SELECT id FROM users WHERE username = $1', ['captcha_replay'])
    assert.equal(users.rows.length, 0, '重放不应创建第二个用户')
  })

  it('篡改载荷签名后校验失败', async () => {
    const proof = await mintAltcha()
    const decoded = JSON.parse(Buffer.from(proof.payload, 'base64').toString('utf8')) as {
      challenge: { signature?: string; parameters: Record<string, unknown> }
      solution: unknown
    }
    decoded.challenge.signature = 'tampered-signature'
    const tampered = Buffer.from(JSON.stringify(decoded)).toString('base64')
    const reply = await call(
      '/api/auth/register',
      postJson({ ...registerBody(tampered), username: 'captcha_tamper' }),
    )
    assert.equal(reply.status, 400, reply.text.slice(0, 200))
    assert.equal((reply.body as { error?: { code?: string } })?.error?.code, 'CHALLENGE_INVALID')
  })
})
