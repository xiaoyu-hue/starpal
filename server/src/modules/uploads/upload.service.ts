import { randomBytes } from 'node:crypto'
import { POST_IMAGES_MAX } from '../../config/constants.js'
import { withTransaction } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import { createPostgresByteaAdapter } from '../../storage/index.js'
import { processImage } from '../../storage/image-pipeline.js'
import { ensurePostEditable, type Viewer } from '../posts/index.js'
import { countImagesOf, insertImageMeta, nextSortOrder } from './upload.repository.js'
import type { UploadedImage } from './upload.types.js'

/**
 * 图片附加到帖子：权限 → 管线 → 事务入库。
 *
 * 三步的顺序不可调换：
 * 1. 先判权限，避免为无权限的请求白跑一次 CPU 密集的重编码；
 * 2. 管线放在**事务之外**，它是数百毫秒级的 CPU 操作，占着数据库连接做会拖垮连接池；
 * 3. 元数据与字节在同一事务内提交，任一步失败整体回滚，不产生孤儿行。
 */

/** 原始文件名仅作展示，不参与任何路径拼接；去掉目录部分并截断，防止超长字段。 */
function safeOriginalName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const trimmed = base.trim().slice(0, 200)
  return trimmed.length > 0 ? trimmed : 'image'
}

export async function attachImage(
  postId: number,
  viewer: Viewer,
  file: { buffer: Buffer; originalName: string },
): Promise<UploadedImage> {
  await ensurePostEditable(postId, viewer)

  const processed = await processImage(file.buffer)
  const key = randomBytes(16).toString('hex')

  const created = await withTransaction(async (client) => {
    // 帖子级事务锁：同一帖并发上传时串行分配排序位，否则会撞 (post_id, sort_order) 唯一约束。
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [postId])

    const existing = await countImagesOf(client, postId)
    if (existing >= POST_IMAGES_MAX) {
      throw new DomainError('CONFLICT', `单篇内容最多 ${POST_IMAGES_MAX} 张图片`)
    }

    const sortOrder = await nextSortOrder(client, postId)
    const imageId = await insertImageMeta(client, {
      postId,
      key,
      originalName: safeOriginalName(file.originalName),
      mimeType: processed.mimeType,
      width: processed.width,
      height: processed.height,
      byteSize: processed.buffer.byteLength,
      sortOrder,
    })

    // 复用同一事务连接：元数据与字节要么同时可见，要么同时消失。
    await createPostgresByteaAdapter(client).put({
      key,
      buffer: processed.buffer,
      mimeType: processed.mimeType,
      width: processed.width,
      height: processed.height,
      imageId,
    })

    return { id: imageId, sortOrder }
  })

  return {
    id: created.id,
    key,
    url: `/api/images/${key}`,
    mimeType: processed.mimeType,
    width: processed.width,
    height: processed.height,
    byteSize: processed.buffer.byteLength,
    sortOrder: created.sortOrder,
  }
}
