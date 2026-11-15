// SPDX-License-Identifier: AGPL-3.0-or-later
import type { AnnouncementKind } from '../../types/api'

/**
 * 公告的类型标签与配色。
 * 单独成文件的原因：公告页与右栏卡片都要用，复制一份迟早会改漏一处；
 * 配色在这里集中，新增类型只改这一处。
 */
export const ANNOUNCEMENT_KIND_META: Record<
  AnnouncementKind,
  { label: string; variant: 'topic' | 'accent' | 'neutral' | 'warn' }
> = {
  feature: { label: '新增功能', variant: 'topic' },
  fix: { label: '修复', variant: 'neutral' },
  rule: { label: '规则', variant: 'neutral' },
  status: { label: '当前状态', variant: 'warn' },
  // 运营通知单独一档：它既不是功能发布、也不是规则，用最轻的标签避免抢注意力。
  notice: { label: '通知', variant: 'accent' },
}
