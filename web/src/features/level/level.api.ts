// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet } from '../../lib/api-client'
import type { UserLevel } from '../../types/level'

/**
 * 某人等级（匿名可读）。
 *
 * 这个 GET 在服务端有次生写入：晋级时会抬一次 `users.top_level`。
 * 与成就时间线同属「读时判定 / 读时晋升」，不是缓存穿透，前端也不必因此加特殊处理。
 */
export async function fetchLevel(username: string, signal?: AbortSignal): Promise<UserLevel> {
  const envelope = await apiGet<UserLevel>(`levels/${encodeURIComponent(username)}`, { signal })
  return envelope.data
}
