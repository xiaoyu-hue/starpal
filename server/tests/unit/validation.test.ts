// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DomainError } from '../../src/shared/errors.js'
import { requireString } from '../../src/shared/validation.js'

/**
 * 字符串校验原语。
 * 核心不变量：长度口径必须与数据库 `char_length` 一致（Unicode 码点），
 * 且非法 Unicode（孤立代理项）必须在应用层被拒——否则驱动编码失败会变成 500。
 */
function rule(field: string, min: number, max: number) {
  return { field, min, max, trim: true, allowInnerWhitespace: true }
}

function assertRejected(run: () => unknown, hint: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof DomainError, `${hint}：应抛 DomainError，实际 ${String(error)}`)
    assert.equal(error.code, 'VALIDATION_FAILED', `${hint}：错误码应为 VALIDATION_FAILED`)
    return true
  }, hint)
}

describe('requireString 长度口径', () => {
  it('emoji 按 1 个字符计：10 个 emoji 满足 max=10', () => {
    const text = '😀'.repeat(10)
    assert.equal(text.length, 20, '前置：UTF-16 码元为 20，若按 length 计会误判超限')
    assert.equal(requireString(text, rule('body', 1, 10)), text)
  })

  it('11 个 emoji 超过 max=10', () => {
    assertRejected(() => requireString('😀'.repeat(11), rule('body', 1, 10)), '超限 1 个字符')
  })

  it('中文与 emoji 混排按码点累计', () => {
    // 5 个汉字 + 5 个 emoji = 10 个码点
    const text = `一二三四五${'😀'.repeat(5)}`
    assert.equal(requireString(text, rule('body', 1, 10)), text)
    assertRejected(() => requireString(`${text}六`, rule('body', 1, 10)), '混排超限')
  })

  it('ZWJ 组合 emoji 按其码点数计（明确口径为码点而非字素簇）', () => {
    const family = '👨‍👩‍👧‍👦'
    assert.equal(Array.from(family).length, 7, '前置：家庭 emoji 由 7 个码点组成')
    assert.equal(requireString(family, rule('body', 1, 7)), family)
    assertRejected(() => requireString(family, rule('body', 1, 6)), '码点口径下 7 > 6')
  })

  it('min 边界：空串被拒，单字符通过', () => {
    assertRejected(() => requireString('', rule('body', 1, 10)), '空串')
    assert.equal(requireString('好', rule('body', 1, 10)), '好')
  })

  it('trim 后长度参与判定，返回值已归一化', () => {
    assert.equal(requireString('  你好  ', rule('body', 2, 10)), '你好')
    assertRejected(() => requireString('  你  ', rule('body', 2, 10)), 'trim 后仅 1 字符')
  })
})

describe('requireString Unicode 合法性', () => {
  it('孤立高代理项被拒，而不是留到驱动编码时抛 500', () => {
    assertRejected(() => requireString('\uD800', rule('body', 1, 10)), '孤立高代理')
  })

  it('孤立低代理项被拒', () => {
    assertRejected(() => requireString('a\uDC00b', rule('body', 1, 10)), '孤立低代理')
  })

  it('合法的代理对（emoji）不受影响', () => {
    assert.equal(requireString('\u{1F600}', rule('body', 1, 10)), '\u{1F600}')
  })

  it('零宽连接符等格式字符是合法 Unicode，可通过', () => {
    assert.equal(requireString('a\u200Db', rule('body', 1, 10)), 'a\u200Db')
  })
})
