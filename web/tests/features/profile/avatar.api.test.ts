// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 头像 URL 工具与风格清单读取。
 *
 * URL 拼装 / 反解是头像功能的核心契约：前端写入的格式必须与服务端的
 * requireAvatarUrl 校验严格对应，否则保存会被 400 拒绝。这里把格式钉死成用例。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiGetMock = vi.fn()
vi.mock('../../../src/lib/api-client', () => ({ apiGet: (...args: unknown[]) => apiGetMock(...args) }))

import {
  avatarImageUrl,
  fetchAvatarStyles,
  isValidSeed,
  parseAvatarUrl,
  randomSeed,
} from '../../../src/features/profile/avatar.api'

beforeEach(() => {
  apiGetMock.mockReset()
})

describe('avatarImageUrl', () => {
  it('按约定格式拼装站内 URL，并对种子做 URL 编码', () => {
    expect(avatarImageUrl('bottts', 'alice')).toBe('/api/avatars/bottts?seed=alice')
    expect(avatarImageUrl('pixel-art', '星聚 用户')).toBe(
      `/api/avatars/pixel-art?seed=${encodeURIComponent('星聚 用户')}`,
    )
  })
})

describe('parseAvatarUrl', () => {
  it('反解站内头像 URL', () => {
    expect(parseAvatarUrl('/api/avatars/bottts?seed=alice')).toEqual({
      slug: 'bottts',
      seed: 'alice',
    })
    expect(parseAvatarUrl('/api/avatars/pixel-art?seed=%E6%98%9F%E8%81%9A')).toEqual({
      slug: 'pixel-art',
      seed: '星聚',
    })
  })

  it('外链与空值返回 null（兼容老用户，不误判为预设头像）', () => {
    expect(parseAvatarUrl('https://example.com/a.png')).toBeNull()
    expect(parseAvatarUrl(null)).toBeNull()
    expect(parseAvatarUrl('/api/avatars/bottts')).toBeNull()
  })
})

describe('isValidSeed', () => {
  it('接受文字、数字、空格、连字符、下划线', () => {
    for (const seed of ['alice', '星聚 用户', 'a-b_c', '123', 'a'.repeat(64)]) {
      expect(isValidSeed(seed)).toBe(true)
    }
  })

  it('拒绝空、超长与危险字符', () => {
    for (const seed of ['', 'a'.repeat(65), '<script>', 'a/b', 'x?y', 'a&b', '"q"']) {
      expect(isValidSeed(seed)).toBe(false)
    }
  })
})

describe('randomSeed', () => {
  it('生成 10 位且始终是合法种子', () => {
    for (let i = 0; i < 20; i++) {
      const seed = randomSeed()
      expect(seed).toHaveLength(10)
      expect(isValidSeed(seed)).toBe(true)
    }
  })

  it('两次生成大概率不同', () => {
    expect(randomSeed()).not.toBe(randomSeed())
  })
})

describe('fetchAvatarStyles', () => {
  it('解包统一包络并返回风格清单', async () => {
    const styles = [{ slug: 'bottts', label: 'Bottts' }]
    apiGetMock.mockResolvedValue({ data: styles })
    await expect(fetchAvatarStyles()).resolves.toEqual(styles)
    expect(apiGetMock).toHaveBeenCalledWith('meta/avatar-styles')
  })
})
