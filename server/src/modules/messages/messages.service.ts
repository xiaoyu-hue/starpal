// SPDX-License-Identifier: AGPL-3.0-or-later
import { encodeCursor } from '../../shared/pagination.js'
import { DomainError } from '../../shared/errors.js'
import {
  findOrCreateConversation,
  findUserByUsername,
  getConversation,
  listConversations,
  listMessages,
  sendMessage,
  type ConversationWithOtherRow,
  type Executor,
  type MessageRow,
} from './messages.repository.js'
import { MESSAGE_BODY_MAX } from './messages.schema.js'

/** 对外：会话中对方的用户画像。 */
export type OtherUser = {
  username: string
  displayName: string
  avatarUrl: string | null
  titles: string[]
}

/** 对外：会话视图（含最近消息预览与活动时间）。 */
export type ConversationView = {
  id: string
  other: OtherUser
  lastMessage: { body: string; createdAt: string; senderId: string } | null
  updatedAt: string
}

/** 对外：单条消息。 */
export type MessageItem = {
  id: string
  body: string
  senderId: string
  createdAt: string
}

export type ConversationPage = {
  items: ConversationView[]
  nextCursor: string | null
  hasMore: boolean
}

export type MessagePage = {
  items: MessageItem[]
  nextCursor: string | null
  hasMore: boolean
}

function otherOf(row: ConversationWithOtherRow): OtherUser {
  return {
    username: row.username,
    displayName: row.display_name ?? row.username,
    avatarUrl: null,
    titles: row.titles,
  }
}

function activityOf(row: ConversationWithOtherRow): Date {
  return row.last_message_at ?? row.conv_created_at
}

function toConversationView(row: ConversationWithOtherRow): ConversationView {
  return {
    id: String(row.id),
    other: otherOf(row),
    lastMessage:
      row.last_body && row.last_message_at && row.last_sender_id != null
        ? {
            body: row.last_body,
            createdAt: row.last_message_at.toISOString(),
            senderId: String(row.last_sender_id),
          }
        : null,
    updatedAt: activityOf(row).toISOString(),
  }
}

function toMessageItem(row: MessageRow): MessageItem {
  return {
    id: String(row.id),
    body: row.body,
    senderId: String(row.sender_id),
    createdAt: row.created_at.toISOString(),
  }
}

/**
 * 发起（或复用）与某用户的会话。
 * 校验：收件人必须存在且未停用；不能与自己发起。两人之间恒唯一（靠迁移层表达式唯一索引）。
 */
export async function createConversation(
  currentUserId: string,
  otherUsername: string,
  executor?: Executor,
): Promise<ConversationView> {
  const user = await findUserByUsername(otherUsername, executor)
  if (!user) {
    throw new DomainError('VALIDATION_FAILED', '收件人不存在', [
      { field: 'username', constraint: '有效的用户名' },
    ])
  }
  if (String(user.id) === currentUserId) {
    throw new DomainError('FORBIDDEN', '不能与自己发起私信')
  }
  const conv = await findOrCreateConversation(currentUserId, String(user.id), executor)
  const row = await getConversation(String(conv.id), currentUserId, executor)
  if (!row) {
    throw new DomainError('FORBIDDEN', '会话创建失败')
  }
  return toConversationView(row)
}

/** 列出当前用户的会话（按活动时间倒序）。 */
export async function listConversationsFor(
  userId: string,
  cursor: { t: string; id: string } | null,
  limit: number,
  executor?: Executor,
): Promise<ConversationPage> {
  const rows = await listConversations(userId, cursor, limit, executor)
  const hasMore = rows.length > limit
  const pageRows = rows.slice(0, limit)
  const items = pageRows.map(toConversationView)
  const last = pageRows[pageRows.length - 1]
  const nextCursor =
    hasMore && last
      ? encodeCursor({ t: activityOf(last).toISOString(), id: String(last.id) })
      : null
  return { items, nextCursor, hasMore }
}

/** 取单个会话（校验参与者，非参与者视为无权）。 */
export async function getConversationFor(
  userId: string,
  conversationId: string,
  executor?: Executor,
): Promise<ConversationView> {
  const row = await getConversation(conversationId, userId, executor)
  if (!row) {
    throw new DomainError('FORBIDDEN', '无权访问该会话')
  }
  return toConversationView(row)
}

/** 列出某会话的消息（校验参与者）。 */
export async function listMessagesFor(
  userId: string,
  conversationId: string,
  cursor: { t: string; id: string } | null,
  limit: number,
  executor?: Executor,
): Promise<MessagePage> {
  // 先校验参与者；getConversation 非参与者返回 null → FORBIDDEN。
  await getConversationFor(userId, conversationId, executor)
  const rows = await listMessages(conversationId, cursor, limit, executor)
  const hasMore = rows.length > limit
  const pageRows = rows.slice(0, limit)
  const items = pageRows.map(toMessageItem)
  const last = pageRows[pageRows.length - 1]
  const nextCursor =
    hasMore && last
      ? encodeCursor({ t: last.created_at.toISOString(), id: String(last.id) })
      : null
  return { items, nextCursor, hasMore }
}

/** 在会话中发送消息（校验参与者，并在服务层兜底非空 / 长度，避免绕过 schema 的空消息入库）。 */
export async function sendMessageIn(
  userId: string,
  conversationId: string,
  body: string,
  executor?: Executor,
): Promise<MessageItem> {
  const text = body.trim()
  if (text === '') {
    throw new DomainError('VALIDATION_FAILED', '消息内容不能为空', [
      { field: 'body', constraint: '非空' },
    ])
  }
  if (text.length > MESSAGE_BODY_MAX) {
    throw new DomainError('VALIDATION_FAILED', '消息内容过长', [
      { field: 'body', constraint: `不超过 ${MESSAGE_BODY_MAX} 字` },
    ])
  }
  await getConversationFor(userId, conversationId, executor)
  const row = await sendMessage(conversationId, userId, text, executor)
  return toMessageItem(row)
}
