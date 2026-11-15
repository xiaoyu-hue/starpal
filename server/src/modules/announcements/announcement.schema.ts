// SPDX-License-Identifier: AGPL-3.0-or-later
import { requireBoolean, requireEnum, requireObject, requireString } from '../../shared/validation.js'
import {
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_STATUSES,
  type AnnouncementInput,
  type AnnouncementPatch,
} from './announcement.types.js'

/** 与迁移 016 的列宽一致：标题 VARCHAR(120)，摘要不设库约束但前端按 300 字收。 */
export const TITLE_MAX = 120
export const SUMMARY_MAX = 300
export const BODY_MAX = 5000

/** 新建公告：全部必填项在这里一次校验完，服务层不再重复判空。 */
export function parseCreate(body: unknown): AnnouncementInput {
  const input = requireObject(body)
  return {
    kind: requireEnum(input.kind, 'kind', ANNOUNCEMENT_KINDS),
    title: requireString(input.title, {
      field: 'title',
      min: 1,
      max: TITLE_MAX,
      trim: true,
      allowInnerWhitespace: true,
    }),
    summary: requireString(input.summary, {
      field: 'summary',
      min: 1,
      max: SUMMARY_MAX,
      trim: true,
      allowInnerWhitespace: true,
    }),
    // 正文允许为空：一条只有一句话的提醒（如「今晚 22:00 维护」）不必硬凑要点。
    body: requireString(input.body ?? '', {
      field: 'body',
      min: 0,
      max: BODY_MAX,
      trim: true,
      allowInnerWhitespace: true,
    }),
    isPinned: input.isPinned === undefined ? false : requireBoolean(input.isPinned, 'isPinned'),
    status: input.status === undefined ? 'draft' : requireEnum(input.status, 'status', ANNOUNCEMENT_STATUSES),
  }
}

/**
 * 编辑公告：只校验出现的字段。
 *
 * 不用「先查再整条覆盖」：部分更新能让界面只提交改动项，
 * 也避免并发编辑时把别人刚改的字段冲掉。
 */
export function parsePatch(body: unknown): AnnouncementPatch {
  const input = requireObject(body)
  const patch: AnnouncementPatch = {}
  if (input.kind !== undefined) patch.kind = requireEnum(input.kind, 'kind', ANNOUNCEMENT_KINDS)
  if (input.title !== undefined) {
    patch.title = requireString(input.title, {
      field: 'title',
      min: 1,
      max: TITLE_MAX,
      trim: true,
      allowInnerWhitespace: true,
    })
  }
  if (input.summary !== undefined) {
    patch.summary = requireString(input.summary, {
      field: 'summary',
      min: 1,
      max: SUMMARY_MAX,
      trim: true,
      allowInnerWhitespace: true,
    })
  }
  if (input.body !== undefined) {
    patch.body = requireString(input.body, {
      field: 'body',
      min: 0,
      max: BODY_MAX,
      trim: true,
      allowInnerWhitespace: true,
    })
  }
  if (input.isPinned !== undefined) patch.isPinned = requireBoolean(input.isPinned, 'isPinned')
  if (input.status !== undefined) {
    patch.status = requireEnum(input.status, 'status', ANNOUNCEMENT_STATUSES)
  }
  return patch
}
