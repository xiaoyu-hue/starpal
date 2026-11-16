// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 分页合并与 meta 解析。
 *
 * 这两处是「快速往下滚」时的真 bug 温床：游标分页在两次请求之间可能有新帖插入，
 * 同一篇帖子会出现在相邻两页里；不去重就会渲染重复 key，React 直接告警并错位。
 */
import { describe, expect, it } from 'vitest'
import { mergeFeedPages, pageMetaOf } from '../../src/lib/pagination'
import type { FeedPost } from '../../src/types/api'

function post(id: number): FeedPost {
  return {
    id,
    title: `帖子 ${id}`,
    excerpt: '',
    topic: { slug: 'general', nameZh: '综合' },
    author: { username: `u${id}`, displayName: `用户${id}`, avatarUrl: null, titles: [] },
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    isLiked: false,
    isBookmarked: false,
    images: [],
    createdAt: '2026-11-16T00:00:00.000Z',
  }
}

describe('mergeFeedPages', () => {
  it('按页顺序拼接，并保持每页内部顺序', () => {
    const merged = mergeFeedPages([{ items: [post(1), post(2)] }, { items: [post(3)] }])
    expect(merged.map((item) => item.id)).toEqual([1, 2, 3])
  })

  it('跨页重复的帖子只保留首次出现的那一条', () => {
    const merged = mergeFeedPages([{ items: [post(1), post(2)] }, { items: [post(2), post(3)] }])
    expect(merged.map((item) => item.id)).toEqual([1, 2, 3])
  })

  it('同页内的重复也能去掉', () => {
    const merged = mergeFeedPages([{ items: [post(5), post(5)] }])
    expect(merged).toHaveLength(1)
  })

  it('空输入返回空数组，不抛错', () => {
    expect(mergeFeedPages([])).toEqual([])
    expect(mergeFeedPages([{ items: [] }, { items: [] }])).toEqual([])
  })
})

describe('pageMetaOf', () => {
  it('合法 meta 原样映射', () => {
    expect(pageMetaOf({ nextCursor: 'c1', hasMore: true })).toEqual({
      nextCursor: 'c1',
      hasMore: true,
    })
  })

  it('hasMore 只有严格 true 才算真，字符串 "true" 不算', () => {
    expect(pageMetaOf({ nextCursor: null, hasMore: 'true' }).hasMore).toBe(false)
  })

  it('nextCursor 非字符串一律归为 null', () => {
    expect(pageMetaOf({ nextCursor: 123, hasMore: true }).nextCursor).toBeNull()
  })

  it('null / undefined / 非对象输入回退到「没有下一页」', () => {
    const fallback = { nextCursor: null, hasMore: false }
    expect(pageMetaOf(null)).toEqual(fallback)
    expect(pageMetaOf(undefined)).toEqual(fallback)
    expect(pageMetaOf('oops')).toEqual(fallback)
    expect(pageMetaOf(0)).toEqual(fallback)
  })
})
