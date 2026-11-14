// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import { applyBookmark, applyLike, type BookmarkState, type LikeState } from './interaction.repository.js'

/**
 * 互动服务。
 *
 * 只有公开且未删除的帖子可以被点赞 / 收藏：草稿、已移除、已删除一律按不存在处理，
 * 与 `post.service` 的可见性口径一致——不可见即不存在，不通过状态差异泄露内容存在性。
 */
async function assertInteractable(postId: number): Promise<void> {
  const result = await pool.query(
    `SELECT 1 FROM posts
      WHERE id = $1 AND status = 'published' AND deleted_at IS NULL`,
    [postId],
  )
  if (result.rowCount === 0) throw new DomainError('NOT_FOUND', '帖子不存在')
}

export async function setLike(postId: number, userId: string, on: boolean): Promise<LikeState> {
  await assertInteractable(postId)
  return applyLike(postId, userId, on)
}

export async function setBookmark(
  postId: number,
  userId: string,
  on: boolean,
): Promise<BookmarkState> {
  await assertInteractable(postId)
  return applyBookmark(postId, userId, on)
}
