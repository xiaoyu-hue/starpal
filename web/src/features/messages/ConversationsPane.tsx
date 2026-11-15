// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { Avatar, Card } from '../../components/ui/Primitives'
import { Button } from '../../components/ui/Button'
import { TitleBadges } from '../users'
import type { ConversationItem } from '../../types/api'
import { useConversationsQuery, useStartConversation } from './messages.queries'
import { messageOf } from './messages.errors'

function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

type Props = {
  activeId: string | null
  onSelect: (conversation: ConversationItem) => void
}

/**
 * 左栏：发起新会话 + 我的会话列表。
 * 发起入口与「从他人主页点发私信」共用同一个创建接口，两人之间恒唯一。
 */
export function ConversationsPane({ activeId, onSelect }: Props) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const list = useConversationsQuery()
  const start = useStartConversation()

  const items = (list.data?.pages ?? []).flatMap((page) => page.items)

  function handleStart(event: React.FormEvent) {
    event.preventDefault()
    const name = username.trim().replace(/^@/, '')
    if (name === '') return
    setError(null)
    start.mutate(name, {
      onSuccess: (conversation) => {
        setUsername('')
        onSelect(conversation)
      },
      onError: (cause) =>
        setError(messageOf(cause, '找不到这个用户，或暂不能与他发起私信。')),
    })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={handleStart}>
          <label htmlFor="dm-username" className="mb-1.5 block text-sm font-medium text-ink">
            发起私信
          </label>
          <div className="flex gap-2">
            <input
              id="dm-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="对方用户名"
              autoComplete="off"
              className="sp-transition h-9 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <Button type="submit" size="sm" loading={start.isPending} disabled={username.trim() === ''}>
              <MessageSquarePlus size={14} /> 开始
            </Button>
          </div>
          {error ? (
            <p className="mt-2 text-xs text-[var(--sp-danger)]" role="alert">
              {error}
            </p>
          ) : (
            <p className="mt-2 text-xs text-faint">
              输入用户名即可开聊；也可以从他人主页点「发私信」。
            </p>
          )}
        </form>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">会话</h2>

        {list.isPending ? (
          <p className="px-4 py-6 text-sm text-muted">正在加载会话…</p>
        ) : list.isError ? (
          <div className="px-4 py-6">
            <p className="text-sm text-[var(--sp-danger)]" role="alert">
              {messageOf(list.error, '会话列表加载失败。')}
            </p>
            <button
              type="button"
              onClick={() => void list.refetch()}
              className="mt-2 text-sm text-accent hover:underline"
            >
              重试
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">
            还没有会话。输入对方用户名，或去他人主页点「发私信」。
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation)}
                  aria-current={conversation.id === activeId ? 'true' : undefined}
                  className={`sp-transition flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-subtle ${
                    conversation.id === activeId ? 'bg-accent-soft' : ''
                  }`}
                >
                  <Avatar
                    name={conversation.other.displayName}
                    src={conversation.other.avatarUrl}
                    size={36}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-ink">
                        {conversation.other.displayName}
                      </span>
                      <TitleBadges titles={conversation.other.titles} size="sm" />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {conversation.lastMessage?.body ?? '还没有消息'}
                    </span>
                    <span className="mt-0.5 block text-[length:var(--sp-text-xs)] text-faint">
                      {formatTime(conversation.lastMessage?.createdAt ?? conversation.updatedAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {list.hasNextPage ? (
          <div className="border-t border-line px-4 py-3">
            <Button
              size="sm"
              variant="ghost"
              loading={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              加载更多会话
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
