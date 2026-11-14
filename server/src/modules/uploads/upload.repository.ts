// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PoolClient } from 'pg'
import { DomainError } from '../../shared/errors.js'

/**
 * 图片元数据写入（`post_images`）。
 *
 * 只接受事务连接：元数据与 `image_blobs` 字节必须在同一事务内落库，
 * 否则会出现「有元数据没字节」或「有字节没元数据」的孤儿状态。
 */

/** 同帖图片数：超上限即拒绝，避免单帖拖垮详情页渲染与存储额度。 */
export async function countImagesOf(client: PoolClient, postId: number): Promise<number> {
  const result = await client.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM post_images WHERE post_id = $1',
    [postId],
  )
  return result.rows[0]?.n ?? 0
}

/**
 * 取下一个排序位。
 *
 * 用 `MAX(sort_order) + 1` 而非 `count(*)`：删掉中间一张后 count 会回退，
 * 与现存序号撞车会直接触发唯一约束。调用方须先持有帖子级事务锁。
 */
export async function nextSortOrder(client: PoolClient, postId: number): Promise<number> {
  const result = await client.query<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM post_images WHERE post_id = $1',
    [postId],
  )
  return result.rows[0]?.next ?? 0
}

/**
 * 删除元数据行并返回其存储键；`image_blobs` 由外键级联清理，不单独删字节。
 *
 * 必须带 `post_id` 条件：否则作者可以用自己帖子的登录态删掉别人帖子的图，
 * 只要猜到对方图片主键。越权与不存在同样返回 null，由服务层统一按 NOT_FOUND 处理。
 * 删除后 `sort_order` 留下空位，不做重排——重排会撞上 (post_id, sort_order) 唯一约束，
 * 而 `nextSortOrder` 取 `MAX + 1`，空位不影响后续追加。
 */
export async function deleteImageMeta(
  client: PoolClient,
  postId: number,
  imageId: number,
): Promise<string | null> {
  const result = await client.query<{ storage_key: string }>(
    'DELETE FROM post_images WHERE id = $1 AND post_id = $2 RETURNING storage_key',
    [imageId, postId],
  )
  return result.rows[0]?.storage_key ?? null
}

export type InsertImageInput = {
  postId: number
  key: string
  originalName: string
  mimeType: string
  width: number
  height: number
  byteSize: number
  sortOrder: number
}

/** 写入元数据行并返回主键；`key` 唯一约束冲突说明随机键重复，属极端异常。 */
export async function insertImageMeta(
  client: PoolClient,
  input: InsertImageInput,
): Promise<number> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO post_images
       (post_id, storage_key, original_name, mime_type, width, height, byte_size, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      input.postId,
      input.key,
      input.originalName,
      input.mimeType,
      input.width,
      input.height,
      input.byteSize,
      input.sortOrder,
    ],
  )
  const row = result.rows[0]
  if (!row) throw new DomainError('INTERNAL_ERROR', '图片元数据写入失败')
  return Number(row.id)
}
