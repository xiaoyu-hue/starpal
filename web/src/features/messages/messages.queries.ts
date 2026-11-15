// SPDX-License-Identifier: AGPL-3.0-or-later
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConversationPage, MessagePage } from '../../types/api'
import { fetchConversations, fetchMessages, sendMessage, startConversation } from './messages.api'

/**
 * 私信的查询键（域内键，不外扩到 lib/query-keys）。
 * `all` 是 `list` 的前缀，失效 all 即覆盖列表与全部会话线程，
 * 发送成功后只需按需失效 list（会话排序/预览变了）与对应 thread。
 */
export const conversationKeys = {
  all: ['messages'] as const,
  list: ['messages', 'conversations'] as const,
  thread: (id: string) => ['messages', 'thread', id] as const,
}

/** 会话列表：游标分页，与信息流同构。 */
export function useConversationsQuery() {
  return useInfiniteQuery({
    queryKey: conversationKeys.list,
    queryFn: ({ pageParam, signal }) => fetchConversations(pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: ConversationPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  })
}

/**
 * 会话内消息：分页向上翻（加载更早）。
 * 刻意不做轮询/实时推送——本期是留言式私信，刷新即取最新（见 M5-S1 计划范围）。
 */
export function useMessagesQuery(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: conversationKeys.thread(conversationId ?? 'none'),
    queryFn: ({ pageParam, signal }) =>
      fetchMessages(conversationId as string, pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: MessagePage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: conversationId !== null,
  })
}

/** 发起会话：成功后会话列表必然多一条或顺序变化，直接失效重取。 */
export function useStartConversation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (username: string) => startConversation(username),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: conversationKeys.list })
    },
  })
}

/** 发送消息：成功后失效当前线程与列表（列表要更新预览与排序）。 */
export function useSendMessage(conversationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => sendMessage(conversationId, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: conversationKeys.thread(conversationId) })
      void client.invalidateQueries({ queryKey: conversationKeys.list })
    },
  })
}
