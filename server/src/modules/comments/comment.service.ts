import { pool } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import { encodeCursor } from '../../shared/pagination.js'
import { loadVisiblePost, type Viewer } from '../posts/index.js'
import {
  findCommentRef,
  insertComment,
  listComments,
  removeComment,
  type CommentRow,
  type Executor,
} from './comment.repository.js'
import type { CommentItem, CommentPage } from './comment.types.js'
import type { CommentQuery, CreateCommentInput } from './comment.schema.js'

/**
 * 评论服务：可见性与归属判定集中于此。
 *
 * 列表对管理员额外可见 `removed` 项（标灰展示），普通读者只看到 `published`——
 * 与帖子「已移除仅管理员可见」同一口径，不让读者借评论状态探测管理动作。
 */

const poolExecutor: Executor = { query: (sql, params) => pool.query(sql, params) }

function toItem(row: CommentRow, viewer: Viewer): CommentItem {
  const isAuthor = viewer !== null && String(row.author_id) === viewer.id
  const erased = row.author_status === 'deleted'
  return {
    id: Number(row.id),
    body: row.body,
    status: row.status === 'removed' ? 'removed' : 'published',
    author: {
      username: row.username,
      displayName: erased ? '已注销用户' : row.display_name,
      avatarUrl: erased ? null : row.avatar_url,
    },
    createdAt: row.created_at.toISOString(),
    isAuthor,
    canRemove: viewer !== null && (isAuthor || viewer.role === 'admin'),
  }
}

export async function listPostComments(
  postId: number,
  query: CommentQuery,
  viewer: Viewer,
): Promise<CommentPage> {
  const post = await loadVisiblePost(postId, viewer)
  const includeRemoved = viewer?.role === 'admin'
  const { rows, hasMore } = await listComments(
    poolExecutor,
    post.id,
    includeRemoved,
    query.cursor,
    query.limit,
  )
  const last = rows[rows.length - 1]
  return {
    items: rows.map((row) => toItem(row, viewer)),
    nextCursor:
      hasMore && last !== undefined
        ? encodeCursor({ t: last.created_at.toISOString(), id: String(last.id) })
        : null,
    hasMore,
  }
}

/** 发表：只有已发布的帖子可评论；草稿、已移除、已删除一律按不存在处理。 */
export async function createComment(
  postId: number,
  viewer: Viewer,
  input: CreateCommentInput,
): Promise<CommentItem> {
  const post = await loadVisiblePost(postId, viewer)
  if (post.status !== 'published') throw new DomainError('NOT_FOUND', '帖子不存在')
  const row = await insertComment(post.id, viewer!.id, input.body)
  return toItem(row, viewer)
}

/**
 * 移除：作者自删记为 `deleted`，管理员移除他人记为 `removed`。
 *
 * 两种状态都从公开列表消失并同步扣减计数，区别只在语义与可恢复性：
 * `removed` 保留原文供管理端复核，`deleted` 视为作者撤销。
 */
export async function deleteComment(commentId: number, viewer: Viewer): Promise<void> {
  const ref = await findCommentRef(commentId)
  if (ref === null) throw new DomainError('NOT_FOUND', '评论不存在')

  const isAuthor = viewer !== null && ref.authorId === viewer.id
  const isAdmin = viewer !== null && viewer.role === 'admin'
  if (!isAuthor && !isAdmin) throw new DomainError('FORBIDDEN', '只能删除自己的评论')
  if (ref.status !== 'published') throw new DomainError('NOT_FOUND', '评论不存在')

  const done = await removeComment(commentId, isAuthor ? 'deleted' : 'removed')
  if (done === null) throw new DomainError('NOT_FOUND', '评论不存在')
}
