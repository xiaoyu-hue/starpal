// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet } from '../../lib/api-client'
import type { Topic } from '../../types/api'

/** 话题目录：只描述路径，传输与错误归一化由 api-client 统一承担。 */
export async function fetchTopics(signal?: AbortSignal): Promise<Topic[]> {
  const envelope = await apiGet<Topic[]>('topics', { signal })
  return envelope.data
}
