// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { deriveSubkey, SUBKEY_INFO } from '../../src/shared/derive-key.js'
import { appEnv } from '../../src/config/env.js'
import { hashInviteCode } from '../../src/modules/invite/index.js'

/**
 * 密钥派生域隔离回归（攻防模拟建议 4）。
 *
 * 单一 SESSION_SECRET 派生多个独立子密钥：不同用途互不相关，
 * 相同用途稳定可复现；邀请码哈希刻意保留原派生以兼容存量数据。
 */
describe('deriveSubkey 域隔离', () => {
  it('不同 info 派生出不同的子密钥（用途之间彼此独立）', () => {
    const subject = deriveSubkey(SUBKEY_INFO.subject)
    const consumed = deriveSubkey(SUBKEY_INFO.altchaConsumed)
    assert.notEqual(subject, consumed, '来源摘要与 ALTCHA 一次性键必须不同')
    assert.notEqual(subject, appEnv.sessionSecret, '子密钥不得等于主密钥')
    assert.equal(subject.length, 64, 'HKDF-SHA256 输出 32 字节 = 64 hex')
  })

  it('相同 info 派生稳定可复现（同一 secret 下确定性）', () => {
    assert.equal(deriveSubkey(SUBKEY_INFO.subject), deriveSubkey(SUBKEY_INFO.subject))
  })

  it('任意第三方 info 不会撞上已用子密钥', () => {
    const known = [deriveSubkey(SUBKEY_INFO.subject), deriveSubkey(SUBKEY_INFO.altchaConsumed)]
    for (let i = 0; i < 5; i++) {
      assert.ok(!known.includes(deriveSubkey(`starpal-other-${i}`)))
    }
  })
})

describe('邀请码哈希保持存量兼容', () => {
  it('哈希值等于裸 SESSION_SECRET 的 HMAC（未迁到子密钥，存量邀请码仍有效）', () => {
    const plain = 'LEGACY-CODE-0001'
    const expected = createHmac('sha256', appEnv.sessionSecret).update(plain).digest('hex')
    assert.equal(hashInviteCode(plain), expected)
  })

  it('与任何域隔离子密钥派生都不同（确认它不在迁移之列）', () => {
    const plain = 'LEGACY-CODE-0002'
    const legacy = hashInviteCode(plain)
    const migrated = createHmac('sha256', deriveSubkey(SUBKEY_INFO.subject))
      .update(plain)
      .digest('hex')
    assert.notEqual(legacy, migrated)
  })
})
