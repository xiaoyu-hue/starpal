// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 信息流容器的 ARIA 角色判断（`M7-S2-T5`）。
 *
 * `role="feed"` 要求它的 owned children 是 `article`。FeedView 在加载中、
 * 失败、空列表三种状态下渲染的是骨架 / 错误卡片 / 空态卡片（均非 article），
 * 此时若仍挂 `role="feed"` 就违反 `aria-required-children`（axe: critical）。
 * 只有真正渲染出帖子卡片时才加这个角色。
 */
export function feedRole(isPending: boolean, isError: boolean, itemCount: number): 'feed' | undefined {
  if (isPending || isError || itemCount === 0) return undefined
  return 'feed'
}
