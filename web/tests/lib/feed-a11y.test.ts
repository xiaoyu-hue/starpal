// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * `role="feed"` 的角色判断：只在真的有 article 时才挂。
 *
 * 这条回归很值钱：违反 `aria-required-children` 时页面视觉完全正常，
 * 只有读屏软件用户受影响，人工点检发现不了。
 */
import { describe, expect, it } from 'vitest'
import { feedRole } from '../../src/lib/feed-a11y'

describe('feedRole', () => {
  it('有条目且非加载 / 非错误时给出 feed 角色', () => {
    expect(feedRole(false, false, 3)).toBe('feed')
  })

  it('加载中、错误、空列表三种非 article 状态一律不给角色', () => {
    expect(feedRole(true, false, 5)).toBeUndefined()
    expect(feedRole(false, true, 5)).toBeUndefined()
    expect(feedRole(false, false, 0)).toBeUndefined()
  })

  it('加载中且无条目时不给角色', () => {
    expect(feedRole(true, false, 0)).toBeUndefined()
  })
})
