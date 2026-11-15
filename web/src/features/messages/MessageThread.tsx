// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Avatar } from '../../components/ui/Primitives'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth'
import { TitleBadges } from '../users'
import type { ConversationItem } from '../../types/api'
import { useMessagesQuery, useSendMessage } from './messages.queries'
import { messageOf } from './messages.errors'

const BODY_MAX = 2000

function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

/**
 * 右栏：当前会话的消息流 + 发送框。
 *
 * 消息接口按时间倒序返回（最新在前），这里用 flex-col-reverse 让视觉上
 * 「最新在最下方」，同时容器初始滚动位置天然落在底部，不必额外测量高度。
 * 「加载更早」因此放在 DOM 末尾（视觉顶部）。
 */
export function MessageThread({ conversation }: { conversation: ConversationItem }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const query = useMessagesQuery(conversation.id)
  const send = useSendMessage(conversation.id)

  const items = (query.data?.pages ?? []).flatMap((page) => page.items)
  const trimmed = text.trim()
  const tooLong = text.length > BODY_MAX

  useEffect(() => {
    // flex-col-reverse 下 scrollTop=0 即最新一条所在位置。
    if (scroller.current) scroller.current.scrollTop = 0
  }, [items.length, conversation.id])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (trimmed === '' || tooLong) return
    setError(null)
    send.mutate(trimmed, {
      onSuccess: () => setText(''),
      onError: (cause) => setError(messageOf(cause, '消息发送失败，请稍后重试。')),
    })
  }

  return (
    <div className="flex min-h-[28rem] flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Avatar name={conversation.other.displayName} src={conversation.other.avatarUrl} size={36} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold text-ink">
              {conversation.other.displayName}
            </h2>
            <TitleBadges titles={conversation.other.titles} size="sm" />
          </div>
          <p className="truncate text-xs text-faint">@{conversation.other.username}</p>
        </div>
      </header>

      <div
        ref={scroller}
        className="flex max-h-[60vh] min-h-[16rem] flex-1 flex-col-reverse gap-3 overflow-y-auto px-4 py-4"
        role="log"
        aria-label="消息记录"
      >
        {query.isPending ? (
          <p className="text-sm text-muted">正在加载消息…</p>
        ) : query.isError ? (
          <div>
            <p className="text-sm text-[var(--sp-danger)]" role="alert">
              {messageOf(query.error, '消息加载失败。')}
            </p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-1 text-sm text-accent hover:underline"
            >
              重试
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">还没有消息，打个招呼吧。</p>
        ) : null}

        {items.map((message) => {
          const mine = message.senderId === user?.id
          return (
            <div key={message.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
              <div className="max-w-[80%]">
                <div
                  className={`whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm leading-6 ${
                    mine
                      ? 'bg-accent text-on-accent'
                      : 'border border-line bg-subtle text-ink'
                  }`}
                >
                  {message.body}
                </div>
                <p
                  className={`mt-1 text-xs text-faint ${mine ? 'text-right' : 'text-left'}`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          )
        })}

        {query.hasNextPage ? (
          <div className="pb-1">
            <Button
              size="sm"
              variant="ghost"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              加载更早的消息
            </Button>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-line px-4 py-3">
        <label htmlFor="dm-body" className="sr-only">
          消息内容
        </label>
        <textarea
          id="dm-body"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          placeholder="写点什么…"
          aria-invalid={tooLong || undefined}
          className="sp-transition w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-faint focus:border-accent"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={`text-xs ${tooLong ? 'text-[var(--sp-danger)]' : 'text-faint'}`}>
            {text.length} / {BODY_MAX}
          </p>
          <Button type="submit" size="sm" loading={send.isPending} disabled={trimmed === '' || tooLong}>
            <Send size={14} /> 发送
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-[var(--sp-danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}
