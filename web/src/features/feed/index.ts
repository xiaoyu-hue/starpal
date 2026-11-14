// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 信息流模块出口。
 * 不在此导出 HomePage：路由层按具体路径懒加载它，经 barrel 静态导出会
 * 让首页代码被并回主包，失去分包意义。
 */
export { PostCard } from './components/PostCard'
export { FeedTabs } from './components/FeedTabs'
export { FeedSkeleton } from './components/FeedSkeleton'
export { FeedView } from './components/FeedView'
export { useFeedQuery, feedKeys } from './queries'
export { useFeedSentinel } from './hooks/useFeedSentinel'
export { fetchFeed } from './api'
