// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { pool } from '../db/pool.js'
import {
  STORAGE_KEY_PATTERN,
  type StorageAdapter,
  type StoragePutInput,
  type StoredBytes,
  type StoredImage,
} from './adapter.js'

/**
 * `postgres-bytea` 存储实现（ADR-014）：图片二进制写入 `image_blobs.data`，
 * 元数据留在 `post_images`，两者一对一、随帖子删除级联清理。
 *
 * 接受外部连接，是为了让上传流程能在**同一事务**内先写元数据、再写字节：
 * 传入 `PoolClient` 即参与调用方事务，任何一步失败整体回滚，不产生孤儿行。
 */
type Queryable = Pool | PoolClient

function assertKey(key: string): void {
  if (!STORAGE_KEY_PATTERN.test(key)) {
    // 属于编程错误而非用户输入：调用方必须先经管线生成合法键。
    throw new Error(`storage: 存储键格式非法（${key.slice(0, 8)}…）`)
  }
}

export function createPostgresByteaAdapter(db: Queryable = pool): StorageAdapter {
  return {
    async put(input: StoragePutInput): Promise<StoredImage> {
      assertKey(input.key)
      if (input.buffer.byteLength === 0) throw new Error('storage: 空字节不允许入库')

      const sha256 = createHash('sha256').update(input.buffer).digest('hex')
      // 不写 ON CONFLICT：同一图片记录的字节不允许被覆盖，重复写入应显式失败。
      await db.query('INSERT INTO image_blobs (image_id, data, sha256) VALUES ($1, $2, $3)', [
        input.imageId,
        input.buffer,
        sha256,
      ])

      return {
        key: input.key,
        mimeType: input.mimeType,
        width: input.width,
        height: input.height,
        byteSize: input.buffer.byteLength,
      }
    },

    async get(key: string): Promise<StoredBytes | null> {
      if (!STORAGE_KEY_PATTERN.test(key)) return null
      const result = await db.query<{ mime_type: string; data: Buffer }>(
        `SELECT i.mime_type, b.data
           FROM post_images i
           JOIN image_blobs b ON b.image_id = i.id
          WHERE i.storage_key = $1`,
        [key],
      )
      const row = result.rows[0]
      if (!row) return null
      // node-postgres 对 BYTEA 返回 Buffer；防御性包装以兼容返回数组的情形。
      const buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data)
      return { buffer, mimeType: row.mime_type }
    },

    async remove(key: string): Promise<void> {
      if (!STORAGE_KEY_PATTERN.test(key)) return
      await db.query(
        'DELETE FROM image_blobs WHERE image_id = (SELECT id FROM post_images WHERE storage_key = $1)',
        [key],
      )
    },
  }
}

/** 默认单例：读取路由与后续上传服务共用同一个实现。 */
export const imageStorage: StorageAdapter = createPostgresByteaAdapter()
