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
