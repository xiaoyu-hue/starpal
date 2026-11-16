// SPDX-License-Identifier: AGPL-3.0-or-later
import type { FeedTab } from '../types/api'

/**
 * 跨域共享的查询键根。
 *
 * 「收藏 / 点赞」这类写入会同时影响三处缓存：帖子详情、信息流、对应的本人列表。
 * 若让某个 feature 去 import 其它 feature 的 barrel 取键，会把 posts 的重型 barrel
 * （静态导出三个页面）拖进首页分包，或在 feed ↔ posts 之间形成循环依赖。
 * 故把这些根键集中到不属于任何 feature 的 lib 层；各域仍从自己的 barrel
 * 重新导出，现有 import 路径保持不变。纯域内键（notificationKeys / profileKeys 等）
 * 仍留在各自域内，不在此堆砌。
 */
export const feedKeys = {
  all: ['feed'] as const,
  list: (tab: FeedTab, topic?: string) => ['feed', 'list', tab, topic ?? 'all'] as const,
}

export const postKeys = {
  all: ['post'] as const,
  detail: (id: number) => ['post', 'detail', id] as const,
  related: (id: number) => ['post', 'related', id] as const,
  comments: (id: number) => ['post', 'comments', id] as const,
}

export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  list: ['bookmarks', 'list'] as const,
}

/** 点赞列表根键：供 posts 域的点赞开关在写入后失效本人的点赞列表。 */
export const likeKeys = {
  all: ['likes'] as const,
  list: ['likes', 'list'] as const,
}

/** 举报 / 申诉：提交与决策都会改变本人列表、管理队列与待处理数量。 */
export const reportKeys = {
  all: ['reports'] as const,
  mine: ['reports', 'mine'] as const,
  queue: (status: string | null) => ['reports', 'queue', status ?? 'all'] as const,
}

/** 管理后台：任一处置动作都可能同时改变多个列表与统计数字，故共用一个根键便于整体失效。 */
export const adminKeys = {
  all: ['admin'] as const,
  users: ['admin', 'users'] as const,
  content: (kind: string) => ['admin', 'content', kind] as const,
  topics: ['admin', 'topics'] as const,
  stats: ['admin', 'stats'] as const,
}
