// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 搜索模块公共出口（barrel）。
 * 刻意不在此导出 SearchPage：路由层按具体路径懒加载它，
 * 经 barrel 静态导出会把页面并回主包（与 feed / likes / bookmarks 同一约定）。
 */
export { fetchSearch, type SearchType } from './search.api'
export { useSearchQuery } from './search.queries'
