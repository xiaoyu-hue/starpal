// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet } from '../../lib/api-client'
import type { WeeklyPopular } from '../../types/api'

/**
 * 本周热门：只读聚合，最多 5 条。
 *
 * 接口路径仍挂在 `achievements/` 下（服务端容器未拆），但语义归属「发现」——
 * 页面把它放在这里，是因为用户找热门内容时先点「发现」，不会想到去成就页。
 */
export async function fetchWeekly(signal?: AbortSignal): Promise<WeeklyPopular> {
  const envelope = await apiGet<WeeklyPopular>('achievements/weekly', { signal })
  return envelope.data
}
