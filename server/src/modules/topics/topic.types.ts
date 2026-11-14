// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 话题对外类型：只暴露界面需要的字段，不出现 created_by 等内部列。
 * 与前端 `web/src/types/api.ts` 的 Topic 保持一致。
 */

export type TopicSummary = {
  id: number
  slug: string
  nameZh: string
  nameEn: string
  description: string | null
  /** 图标名与前端图标表对应；未设置时为 null，由界面回退到默认图标。 */
  icon: string | null
  sortOrder: number
  /** 该话题下当前可见（已发布、未删除、作者未停用）的帖子数。 */
  postCount: number
}
