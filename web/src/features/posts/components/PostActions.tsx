// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, buttonClass } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Dialog'
import { useAuth } from '../../auth'
import { messageOf } from '../errors'
import type { PostDetail } from '../../../types/api'
import { useDeletePostMutation } from '../queries'

/**
 * 作者操作区：编辑与删除。
 * 只有作者本人或管理员看到入口；服务端对 PATCH / DELETE 独立鉴权，
 * 前端隐藏按钮只是减少误触，不承担权限职责。
 */
export function PostActions({ post }: { post: PostDetail }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const mutation = useDeletePostMutation()
  const [error, setError] = useState<string | null>(null)

  const canManage = post.isAuthor || user?.role === 'admin'
  if (!canManage) return null

  function handleDelete() {
    setError(null)
    mutation.mutate(post.id, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (cause) => setError(messageOf(cause, '删除失败，请稍后重试。')),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link to={`/posts/${post.id}/edit`} className={buttonClass('secondary', 'sm')}>
        <Pencil size={14} /> 编辑
      </Link>

      <Modal
        title="删除这篇内容？"
        description="删除后内容立即从站点消失，且无法恢复。若只是想修改，可以选择编辑。"
        trigger={
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />}>
            删除
          </Button>
        }
      >
        <Button variant="danger" loading={mutation.isPending} onClick={handleDelete}>
          确认删除
        </Button>
      </Modal>

      {error ? (
        <p className="text-xs text-[var(--sp-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
