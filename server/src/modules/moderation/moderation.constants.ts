// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 审核日志动作枚举。点分命名 `<对象>.<动作>`，与 ARCHITECTURE §7.3 示例一致。
 *
 * 这里列出全量动作键作为代码内枚举（不建数据库字典表，字典表只会多一处真源）。
 * 当前步只启用 report.resolve / report.dismiss；其余键随对应管理动作逐步接入，
 * 提前列全是为了让后续步骤不必反复改同一份常量，不代表能力已上线。
 */
export const MODERATION_ACTIONS = [
  'report.resolve',
  'report.dismiss',
  'report.review',
  'post.remove',
  'post.restore',
  'comment.remove',
  'comment.restore',
  'user.suspend',
  'user.restore',
  'topic.create',
  'topic.update',
  'topic.archive',
] as const

export type ModerationAction = (typeof MODERATION_ACTIONS)[number]
