// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 话题模块对外出口（barrel）。
 * 其他模块只允许经此文件引用本模块，不得穿透到内部控制器的内部文件（lint 强制）。
 */
export { topicRouter } from './topic.routes.js'
export { listTopics } from './topic.service.js'
export type { TopicSummary } from './topic.types.js'
// 管理端（挂于 adminRouter，受统一守卫保护）：话题增删改归档。
export {
  adminTopicsController,
  adminCreateTopicController,
  adminUpdateTopicController,
  adminSetTopicArchivedController,
  adminListTopics,
  adminCreateTopic,
  adminUpdateTopic,
  adminSetTopicArchived,
} from './topic.admin.service.js'
export type {
  AdminTopicItem,
  AdminTopicInput,
  TopicUpdateInput,
  Executor as TopicExecutor,
} from './topic.admin.types.js'
