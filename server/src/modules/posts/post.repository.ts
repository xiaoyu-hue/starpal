// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PoolClient } from 'pg'
import { pool, withTransaction } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import { FROM_JOINS, PROJECTION, queryRows, type PostRecord } from './post.projection.js'

/**
 * 帖子写入与单条读取：全部参数化查询，不拼接用户输入。
 * 列表与分页查询见 post.feed.repository.ts。
 */

/** 按 ID 取单条（不过滤可见性，由服务层判定）；不存在返回 null。 */
export async function findPostById(id: number): Promise<PostRecord | null> {
  const rows = await queryRows(pool, `SELECT ${PROJECTION} ${FROM_JOINS} WHERE p.id = $1`, [id])
  return rows[0] ?? null
}

async function findPostByIdInTx(client: PoolClient, id: number): Promise<PostRecord> {
  const rows = await queryRows(client, `SELECT ${PROJECTION} ${FROM_JOINS} WHERE p.id = $1`, [id])
  const row = rows[0]
  if (row === undefined) throw new Error(`刚写入的帖子 ${id} 未能读回`)
  return row
}

/** 话题存在性：在事务内校验，给出明确错误而非让外键报错。 */
async function assertTopic(client: PoolClient, topicId: number): Promise<void> {
  const topic = await client.query('SELECT 1 FROM topics WHERE id = $1 AND deleted_at IS NULL', [
    topicId,
  ])
  if (topic.rowCount === 0) throw new DomainError('NOT_FOUND', '话题不存在')
}

/** 创建：话题校验与写入同一事务，避免悬空外键或读到半成品。 */
export async function createPost(
  authorId: string,
  input: { title: string; body: string; excerpt: string; topicId: number },
): Promise<PostRecord> {
  return withTransaction(async (client) => {
    await assertTopic(client, input.topicId)
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO posts (author_id, topic_id, title, body, excerpt)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [authorId, input.topicId, input.title, input.body, input.excerpt],
    )
    return findPostByIdInTx(client, Number(inserted.rows[0]!.id))
  })
}

/** 编辑：仅更新调用方实际提供的字段；已软删除的帖子不可编辑（由 WHERE 兜底）。 */
export async function updatePost(
  id: number,
  input: { title?: string; body?: string; excerpt?: string; topicId?: number },
): Promise<PostRecord | null> {
  return withTransaction(async (client) => {
    if (input.topicId !== undefined) await assertTopic(client, input.topicId)
    const result = await client.query(
      `UPDATE posts
          SET title = COALESCE($2, title),
              body = COALESCE($3, body),
              excerpt = COALESCE($4, excerpt),
              topic_id = COALESCE($5, topic_id),
              updated_at = now()
        WHERE id = $1 AND status <> 'deleted'`,
      [id, input.title ?? null, input.body ?? null, input.excerpt ?? null, input.topicId ?? null],
    )
    if (result.rowCount === 0) return null
    return findPostByIdInTx(client, id)
  })
}

/** 软删除：置 deleted 与 deleted_at（检查约束要求二者同时出现），保留行以便审计与恢复。 */
export async function softDeletePost(id: number): Promise<boolean> {
  const result = await pool.query(
    `UPDATE posts
        SET status = 'deleted', deleted_at = now(), updated_at = now()
      WHERE id = $1 AND status <> 'deleted'`,
    [id],
  )
  return (result.rowCount ?? 0) > 0
}
