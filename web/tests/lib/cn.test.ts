// SPDX-License-Identifier: AGPL-3.0-or-later
/** 类名拼接：条件为假时不留空串，避免 class="a  b" 这种双空格噪声。 */
import { describe, expect, it } from 'vitest'
import { cn } from '../../src/lib/cn'

describe('cn', () => {
  it('只保留真值并按原顺序拼接', () => {
    expect(cn('a', false, 'b', null, undefined, 'c')).toBe('a b c')
  })

  it('全部为假值或空调用时返回空串', () => {
    expect(cn()).toBe('')
    expect(cn(false, null, undefined)).toBe('')
    expect(cn('')).toBe('')
  })

  it('不做去重：同名工具类重复出现时原样保留（后续 CSS 覆盖依赖顺序）', () => {
    expect(cn('px-2', 'px-4')).toBe('px-2 px-4')
  })
})
