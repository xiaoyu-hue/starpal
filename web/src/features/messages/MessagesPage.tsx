// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { Card } from '../../components/ui/Primitives'
import type { ConversationItem } from '../../types/api'
import { ConversationsPane } from './ConversationsPane'
import { MessageThread } from './MessageThread'
import { useStartConversation } from './messages.queries'

/**
 * 私信页（M5-S1）：留言式、无实时推送。
 *
 * 入口有三处，共用同一套数据：
 * 1) 桌面侧栏 / 移动端底部 Tab 的「私信」；
 * 2) 他人主页的「发私信」按钮（带 ?to=用户名，进页即自动建会话）；
 * 3) 本页左栏输入用户名。
 */
export function MessagesPage() {
  const [params, setParams] = useSearchParams()
  const to = params.get('to')
  const [active, setActive] = useState<ConversationItem | null>(null)
  const start = useStartConversation()
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (!to) return
    if (handled.current === to) return
    handled.current = to
    start.mutate(to, {
      onSuccess: (conversation) => {
        setActive(conversation)
        // 清掉 ?to=，刷新页面不会再自动跳进同一个会话。
        setParams({}, { replace: true })
      },
      onError: () => {
        // 目标不存在时留在列表页，错误由左栏输入框自行提示；此处不弹二次提示。
        handled.current = null
      },
    })
  }, [to, start, setParams])

  return (
    <section aria-labelledby="messages-heading">
      <div className="mb-4">
        <h1 id="messages-heading" className="flex items-center gap-2 text-xl font-semibold text-ink">
          <MessageSquare size={20} aria-hidden="true" /> 私信
        </h1>
        <p className="mt-1 text-sm text-muted">
          两人之间的私下留言。对方下次打开页面或刷新时可以看到，不会有实时提醒。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[20rem_1fr]">
        <div className={active ? 'hidden md:block' : 'block'}>
          <ConversationsPane activeId={active?.id ?? null} onSelect={setActive} />
        </div>

        <div className={active ? 'block' : 'hidden md:block'}>
          {active ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-line px-4 py-2 md:hidden">
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="sp-transition inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
                >
                  <ArrowLeft size={14} /> 返回会话列表
                </button>
              </div>
              <MessageThread conversation={active} />
            </Card>
          ) : (
            <Card className="flex min-h-[28rem] items-center justify-center p-6 text-center">
              <div>
                <p className="text-sm font-medium text-ink">选一个会话开始</p>
                <p className="mt-1 text-sm text-muted">
                  从左侧点开会话，或输入对方用户名发起新的私信。
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  )
}
