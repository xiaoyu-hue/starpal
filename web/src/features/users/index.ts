// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 用户模块公共出口。
 * 只 re-export 被其它特性（feed / posts / profile）直接引用的轻量组件与常量；
 * 页面、查询 hook 等较重的依赖按具体路径引用，不在此聚合，避免被并回主包。
 */
export { TitleBadges, TITLE_CATALOG } from './TitleBadges'
