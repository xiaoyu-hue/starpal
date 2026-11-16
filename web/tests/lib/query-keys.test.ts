// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 查询键结构。
 *
 * 这些键是「写入后失效哪些缓存」的唯一依据，一旦顺手改结构，
 * 表现是「点赞了但列表不刷新」——不报错，只是数据陈旧，最难查。
 * 所以这里把结构钉住：根键必须是数组首元素，跨域共享的语义不能漂。
 */
import { describe, expect, it } from 'vitest'
import { adminKeys, bookmarkKeys, feedKeys, likeKeys, postKeys, reportKeys } from '../../src/lib/query-keys'

describe('feedKeys', () => {
  it('根键是独立的单元素前缀', () => {
    expect(feedKeys.all).toEqual(['feed'])
  })

  it('未指定话题时统一落到 all，避免同一列表出现两个键', () => {
    expect(feedKeys.list('latest')).toEqual(['feed', 'list', 'latest', 'all'])
    expect(feedKeys.list('latest', undefined)).toEqual(['feed', 'list', 'latest', 'all'])
  })

  it('不同话题是不同的键', () => {
    expect(feedKeys.list('latest', 'tech')).not.toEqual(feedKeys.list('latest', 'life'))
  })
})

describe('postKeys', () => {
  it('详情、相关、评论三组键互不相等', () => {
    const detail = postKeys.detail(7)
    const related = postKeys.related(7)
    const comments = postKeys.comments(7)
    expect(new Set([detail, related, comments].map((key) => JSON.stringify(key))).size).toBe(3)
  })

  it('帖子 id 参与键，不同帖子不会互相污染缓存', () => {
    expect(postKeys.detail(1)).not.toEqual(postKeys.detail(2))
    expect(postKeys.detail(1)).toEqual(['post', 'detail', 1])
  })
})

describe('bookmarkKeys / likeKeys', () => {
  it('两个列表根键都在各自域下，不会撞车', () => {
    expect(bookmarkKeys.list).toEqual(['bookmarks', 'list'])
    expect(likeKeys.list).toEqual(['likes', 'list'])
    expect(bookmarkKeys.all).toEqual(['bookmarks'])
    expect(likeKeys.all).toEqual(['likes'])
  })
})

describe('reportKeys', () => {
  it('队列键把 null 归一为 all，避免「待处理」出现两个键', () => {
    expect(reportKeys.queue(null)).toEqual(['reports', 'queue', 'all'])
    expect(reportKeys.queue('pending')).toEqual(['reports', 'queue', 'pending'])
  })

  it('我的提交与队列是两个不同的键', () => {
    expect(reportKeys.mine).not.toEqual(reportKeys.queue(null))
  })
})

describe('adminKeys', () => {
  it('三类内容共用 content 前缀但按 kind 区分', () => {
    expect(adminKeys.content('post')).toEqual(['admin', 'content', 'post'])
    expect(adminKeys.content('post')).not.toEqual(adminKeys.content('comment'))
  })

  it('所有管理键都在 admin 根键之下，便于整体失效', () => {
    const keys = [adminKeys.users, adminKeys.topics, adminKeys.stats, adminKeys.content('post')]
    for (const key of keys) {
      expect(key[0]).toBe(adminKeys.all[0])
    }
  })
})
