// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 点赞模块公共出口（barrel）。
 * 刻意不在此导出 LikesPage：路由层按具体路径懒加载它，
 * 经 barrel 静态导出会把列表页并回主包（与 feed/index.ts、bookmarks/index.ts 同一约定）。
 * 写入开关不在此模块：沿用 posts 域的 useLikeMutation（详情页唯一写入口）。
 */
export { fetchLikes } from './likes.api'
export { useLikesQuery } from './likes.queries'
