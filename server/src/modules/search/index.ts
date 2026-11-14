// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 搜索模块对外出口（barrel）。
 * 目前只暴露路由；查询/服务函数仅供模块内与集成测试使用。
 */
export { searchRouter } from './search.routes.js'
export { search } from './search.service.js'
export { parseSearchQuery } from './search.schema.js'
export type { SearchQuery, SearchType } from './search.schema.js'
