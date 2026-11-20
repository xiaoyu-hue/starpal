// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeCursor, encodeCursor } from '../../src/shared/pagination.js'

/** 往返：合法游标必须原样解出（防校验误伤正常分页）。 */
test('decodeCursor：合法游标原样解出', () => {
  const cases = [
    { t: '2026-11-20T05:04:10.230Z', id: '123' },       // 时间键（latest/评论/通知等）
    { t: '0.7123456789', id: '456' },                    // 权重分键（popular，普通小数）
    { t: '1.234e-5', id: '789' },                        // 权重分键（科学计数）
    { t: '0', id: '1' },                                 // 分数恰为 0
    { t: '9223372036854775807', id: '9223372036854775807' }, // bigint 上限 id
  ]
  for (const c of cases) {
    assert.deepEqual(decodeCursor(encodeCursor(c)), c, `往返失败: ${JSON.stringify(c)}`)
  }
})

test('decodeCursor：畸形 t 回落 null', () => {
  const bad = [
    { t: 'x', id: '1' },                                 // 字母（攻防 B1–B5）
    { t: '', id: '1' },                                  // 空串
    { t: 'not-a-date-or-number', id: '1' },
    { t: '   ', id: '1' },
  ]
  for (const c of bad) {
    assert.equal(decodeCursor(encodeCursor(c)), null, `应拒绝: ${JSON.stringify(c)}`)
  }
})

test('decodeCursor：畸形 id 回落 null', () => {
  const bad = [
    { t: '2026-11-20T00:00:00Z', id: 'x' },              // 非数字
    { t: '2026-11-20T00:00:00Z', id: '0' },              // 0
    { t: '2026-11-20T00:00:00Z', id: '-1' },             // 负数
    { t: '2026-11-20T00:00:00Z', id: '1.5' },            // 小数
    { t: '2026-11-20T00:00:00Z', id: '9999999999999999999999' }, // bigint 越界（攻防 B6）
    { t: '2026-11-20T00:00:00Z', id: '' },               // 空串
  ]
  for (const c of bad) {
    assert.equal(decodeCursor(encodeCursor(c)), null, `应拒绝: ${JSON.stringify(c)}`)
  }
})

test('decodeCursor：非 base64 / 非对象 / 缺字段一律 null', () => {
  assert.equal(decodeCursor('!!!not-base64!!!'), null)
  assert.equal(decodeCursor(Buffer.from('[]').toString('base64url')), null)
  assert.equal(decodeCursor(Buffer.from('null').toString('base64url')), null)
  assert.equal(decodeCursor(Buffer.from('{"t":"2026-01-01T00:00:00Z"}').toString('base64url')), null)
  assert.equal(decodeCursor(Buffer.from('{"id":"1"}').toString('base64url')), null)
})
