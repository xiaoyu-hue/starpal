// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet, apiPost } from '../../lib/api-client'
import type {
  ConversationItem,
  ConversationPage,
  MessageItem,
  MessagePage,
} from '../../types/api'

/**
 * 私信接口（整组需要登录态）。
 * 列表与信息流同构：data 为数组、meta 承载 nextCursor / hasMore。
 */

function pageOf<T>(meta: unknown): { nextCursor: string | null; hasMore: boolean } {
  const m = (meta ?? {}) as { nextCursor?: unknown; hasMore?: unknown }
  return {
    nextCursor: typeof m.nextCursor === 'string' ? m.nextCursor : null,
    hasMore: m.hasMore === true,
  }
}

/** 我的会话列表（按活动时间倒序）。 */
export async function fetchConversations(
  cursor?: string,
  signal?: AbortSignal,
): Promise<ConversationPage> {
  const envelope = await apiGet<ConversationItem[]>('messages', { signal, params: { cursor } })
  return { items: envelope.data, ...pageOf(envelope.meta) }
}

/** 会话内消息（时间倒序，键集游标）。 */
export async function fetchMessages(
  conversationId: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<MessagePage> {
  const envelope = await apiGet<MessageItem[]>(`messages/${conversationId}/messages`, {
    signal,
    params: { cursor },
  })
  return { items: envelope.data, ...pageOf(envelope.meta) }
}

/** 按用户名发起（或复用）会话；两人之间恒唯一。 */
export async function startConversation(username: string): Promise<ConversationItem> {
  const envelope = await apiPost<ConversationItem>('messages', { username })
  return envelope.data
}

/** 在会话中发送一条消息。 */
export async function sendMessage(conversationId: string, body: string): Promise<MessageItem> {
  const envelope = await apiPost<MessageItem>(`messages/${conversationId}/messages`, { body })
  return envelope.data
}
