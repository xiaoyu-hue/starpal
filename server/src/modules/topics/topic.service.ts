import { listTopics as selectTopics } from './topic.repository.js'
import type { TopicSummary } from './topic.types.js'

/**
 * 话题服务：当前仅提供只读列表。
 * 增删改（管理员）与管理动作留痕属 M3-S4 完整范围，待 `moderation_logs` 落地后补齐；
 * 发帖与话题筛选只需读到「有哪些话题、id 是多少」，故先交付这一最小可用片段。
 */
export async function listTopics(): Promise<TopicSummary[]> {
  return selectTopics()
}
