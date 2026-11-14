// SPDX-License-Identifier: AGPL-3.0-or-later
import { Trash2 } from 'lucide-react'
import { Avatar, Badge } from '../../../components/ui/Primitives'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Dialog'
import type { CommentItem } from '../../../types/api'

function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

type Props = {
  comment: CommentItem
  removing: boolean
  onRemove: (id: number) => void
}

/**
 * 单条评论。
 *
 * 正文用文本节点渲染（`whitespace-pre-wrap` 保留换行），不注入 HTML——
 * 富文本会引入 XSS 面，而评论只需要换行。
 * `removed` 只有管理员能拿到，用灰底与标签区分，避免误以为没人处理。
 */
export function CommentEntry({ comment, removing, onRemove }: Props) {
  const removed = comment.status === 'removed'

  return (
    <li className="flex gap-3 py-4">
      <Avatar name={comment.author.displayName} src={comment.author.avatarUrl} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{comment.author.displayName}</span>
          <span className="text-xs text-faint">{formatTime(comment.createdAt)}</span>
          {removed && <Badge variant="neutral">已移除</Badge>}
        </div>

        <p
          className={`mt-1 whitespace-pre-wrap break-words text-sm leading-6 ${
            removed ? 'text-faint line-through' : 'text-ink'
          }`}
        >
          {comment.body}
        </p>
      </div>

      {comment.canRemove && !removed && (
        <Modal
          title="删除这条评论？"
          description="删除后评论立即消失，且无法恢复。"
          trigger={
            <Button
              variant="ghost"
              size="sm"
              aria-label="删除评论"
              icon={<Trash2 size={14} />}
              className="shrink-0"
            >
              <span className="sr-only">删除</span>
            </Button>
          }
        >
          <Button
            variant="danger"
            loading={removing}
            onClick={() => onRemove(comment.id)}
          >
            确认删除
          </Button>
        </Modal>
      )}
    </li>
  )
}
