import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Primitives'
import { useAuth } from '../../auth'
import { messageOf } from '../errors'
import { CommentEntry } from './CommentEntry'
import { useCommentMutation, useCommentsQuery } from '../queries'

/** 与后端 `COMMENT_BODY_MAX` 同值。前端只做体验提示，真正的边界在服务端。 */
const BODY_MAX = 2000

function countChars(text: string): number {
  // 与后端 countChars 同口径（Unicode 码点），否则 emoji 会让计数虚高、误拦合法内容。
  return Array.from(text).length
}

type Props = {
  postId: number
  commentCount: number
}

/**
 * 评论区：发表 + 时间倒序列表 + 加载更多。
 *
 * 列表不本地排序也不本地插入：新评论落库后失效查询链重新拉第一页，
 * 保证「看到的最新一条」与服务端一致，避免两条评论同秒时客户端排序抖动。
 */
export function CommentSection({ postId, commentCount }: Props) {
  const { user } = useAuth()
  const query = useCommentsQuery(postId)
  const { create, remove } = useCommentMutation(postId)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const length = countChars(text)
  const tooLong = length > BODY_MAX
  const canSubmit = text.trim().length > 0 && !tooLong && !create.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setError(null)
    create.mutate(text.trim(), {
      onSuccess: () => setText(''),
      onError: (cause) => setError(messageOf(cause, '评论发送失败，请稍后重试。')),
    })
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <MessageCircle size={17} aria-hidden="true" />
        评论
        <span className="text-sm font-normal text-faint">{commentCount}</span>
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="comment-body" className="sr-only">
            评论内容
          </label>
          <textarea
            id="comment-body"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            placeholder="写下你的看法…"
            aria-invalid={tooLong || undefined}
            aria-describedby="comment-counter"
            className="sp-transition w-full resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-faint focus:border-accent"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p
              id="comment-counter"
              className={`text-xs ${tooLong ? 'text-[var(--sp-danger)]' : 'text-faint'}`}
            >
              {length} / {BODY_MAX}
            </p>
            <Button type="submit" size="sm" loading={create.isPending} disabled={!canSubmit}>
              发送
            </Button>
          </div>
          {error ? (
            <p className="mt-2 text-xs text-[var(--sp-danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="mt-4 rounded-md border border-line bg-subtle px-3 py-2.5 text-sm text-muted">
          <Link to="/login" className="text-accent hover:underline">
            登录
          </Link>
          后可以参与讨论。
        </p>
      )}

      {query.isPending ? (
        <div className="mt-4 space-y-3" role="status" aria-live="polite">
          <div className="sp-skeleton h-14 w-full rounded-sm" />
          <div className="sp-skeleton h-14 w-full rounded-sm" />
        </div>
      ) : query.isError ? (
        <p className="mt-4 text-sm text-muted">
          评论加载失败，
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="text-accent hover:underline"
          >
            重试
          </button>
        </p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">还没有评论，来说第一句。</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-line">
            {items.map((comment) => (
              <CommentEntry
                key={comment.id}
                comment={comment}
                removing={remove.isPending && remove.variables === comment.id}
                onRemove={(id) =>
                  remove.mutate(id, {
                    onError: (cause) =>
                      setError(messageOf(cause, '删除失败，请稍后重试。')),
                  })
                }
              />
            ))}
          </ul>

          {query.hasNextPage && (
            <div className="mt-3 text-center">
              <Button
                variant="secondary"
                size="sm"
                loading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                加载更多评论
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
