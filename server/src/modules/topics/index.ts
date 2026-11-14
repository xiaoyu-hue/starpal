/**
 * 话题模块对外出口（barrel）。
 * 其他模块只允许经此文件引用本模块，不得穿透到内部控制器的内部文件（lint 强制）。
 */
export { topicRouter } from './topic.routes.js'
export { listTopics } from './topic.service.js'
export type { TopicSummary } from './topic.types.js'
