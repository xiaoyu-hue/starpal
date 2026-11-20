// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import { applyBookmark, applyLike, type BookmarkState, type LikeState } from './interaction.repository.js'

/**
 * 互动服务。
 *
 * 只有对当前读者可见的帖子可以被点赞 / 收藏：草稿、已移除、已删除、作者被停用、
 * 话题被归档一律按不存在处理，与 `post.service` / 信息流 `VISIBLE` 口径完全一致——
 * 不可见即不存在，既不通过状态差异泄露内容存在性，也不让治理下线的内容产生互动（攻防 C1/C2）。
 * 此处直接 JOIN topics / users 复刻 `post.projection` 的 VISIBLE 条件（遵守模块边界，不跨模块 import）。
 */
async function assertInteractable(postId: number): Promise<void> {
  const result = await pool.query(
    `SELECT 1 FROM posts p
      JOIN topics t ON t.id = p.topic_id
      JOIN users u ON u.id = p.author_id
      WHERE p.id = $1
        AND p.status = 'published' AND p.deleted_at IS NULL
        AND t.deleted_at IS NULL AND u.status <> 'suspended'`,
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
