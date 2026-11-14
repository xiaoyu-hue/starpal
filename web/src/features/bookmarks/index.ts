// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 收藏模块公共出口（barrel）。
 * 刻意不在此导出 BookmarksPage：路由层按具体路径懒加载它，
 * 经 barrel 静态导出会把列表页并回主包（与 feed/index.ts 同一约定）。
 */
export { fetchBookmarks, setBookmark } from './bookmarks.api'
export { useBookmarkMutation, useBookmarksQuery } from './bookmarks.queries'
