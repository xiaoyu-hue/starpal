// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 私信（M5-S1）的前端契约类型。
 *
 * 单独成文件是因为 types/api.ts 已接近行数预算（300 行）。
 * 字段与 server/src/modules/messages/messages.service.ts 的对外视图一一对应；
 * api.ts 末尾按需 re-export，调用方仍可从 '../../types/api' 引入。
 */

/** 私信：会话中的对方。 */
export type ConversationPeer = {
  username: string
  displayName: string
  avatarUrl: string | null
  titles: string[]
}

/** 私信：会话列表里的「最近一条消息」预览。 */
export type ConversationPreview = {
  body: string
  createdAt: string
  senderId: string
}

export type ConversationItem = {
  id: string
  other: ConversationPeer
  lastMessage: ConversationPreview | null
  updatedAt: string
}

export type ConversationPage = {
  items: ConversationItem[]
  nextCursor: string | null
  hasMore: boolean
}

export type MessageItem = {
  id: string
  body: string
  senderId: string
  createdAt: string
}

export type MessagePage = {
  items: MessageItem[]
  nextCursor: string | null
  hasMore: boolean
}
