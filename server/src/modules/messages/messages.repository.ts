// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'

/**
 * 执行器：与 posts 模块 RowExecutor 同形（非泛型方法签名），使 pool 默认参数可直接赋值，
 * 也让同一段 SQL 能在 PGlite 内存库验证（测试注入 executor）。
 */
export type Executor = {
  query(sql: string, params: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

export type ConversationRow = {
  id: number
  participant_a: number
  participant_b: number
  created_at: Date
}

export type ConversationWithOtherRow = {
  id: number
  other_id: number
  username: string
  display_name: string | null
  titles: string[]
  last_message_at: Date | null
  last_body: string | null
  last_sender_id: number | null
  conv_created_at: Date
}

export type MessageRow = {
  id: number
  sender_id: number
  body: string
  created_at: Date
}

export type UserLookupRow = {
  id: number
  username: string
  display_name: string | null
  titles: string[]
}

/**
 * 创建或获取两人会话：靠表达式唯一索引 (LEAST, GREATEST) 保证两人仅一个会话。
 * ON CONFLICT DO UPDATE SET id = id 纯为「冲突时也 RETURNING 现有行」，不产生实际变更。
 */
export async function findOrCreateConversation(
  a: string,
  b: string,
  executor: Executor = pool,
): Promise<ConversationRow> {
  const { rows } = (await executor.query(
    `INSERT INTO conversations (participant_a, participant_b)
       VALUES (LEAST($1::bigint, $2::bigint), GREATEST($1::bigint, $2::bigint))
     ON CONFLICT (participant_a, participant_b)
       DO UPDATE SET id = conversations.id
     RETURNING id, participant_a, participant_b, created_at`,
    [a, b],
  )) as { rows: ConversationRow[] }
  return rows[0]!
}

/** 列出某用户参与的会话，含对方资料与最近一条消息预览，按活动时间倒序。 */
export async function listConversations(
  userId: string,
  cursor: { t: string; id: string } | null,
  limit: number,
  executor: Executor = pool,
): Promise<ConversationWithOtherRow[]> {
  const { rows } = (await executor.query(
    `SELECT
        c.id,
        CASE WHEN c.participant_a = $1::bigint THEN c.participant_b ELSE c.participant_a END AS other_id,
        ou.username, ou.display_name, ou.titles,
        lm.created_at AS last_message_at, lm.body AS last_body, lm.sender_id AS last_sender_id,
        c.created_at AS conv_created_at
      FROM conversations c
      JOIN users ou
        ON ou.id = CASE WHEN c.participant_a = $1::bigint THEN c.participant_b ELSE c.participant_a END
      LEFT JOIN LATERAL (
        SELECT m.body, m.created_at, m.sender_id
          FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 1
      ) lm ON true
     WHERE (c.participant_a = $1::bigint OR c.participant_b = $1::bigint)
       AND ($2::timestamptz IS NULL OR (COALESCE(lm.created_at, c.created_at), c.id) < ($2::timestamptz, $3::bigint))
     ORDER BY COALESCE(lm.created_at, c.created_at) DESC NULLS LAST, c.id DESC
     LIMIT $4`,
    [userId, cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )) as { rows: ConversationWithOtherRow[] }
  return rows
}

/** 取单个会话并附带对方资料；非参与者查询返回空（由服务层转 FORBIDDEN）。 */
export async function getConversation(
  conversationId: string,
  userId: string,
  executor: Executor = pool,
): Promise<ConversationWithOtherRow | null> {
  const { rows } = (await executor.query(
    `SELECT
        c.id,
        CASE WHEN c.participant_a = $2::bigint THEN c.participant_b ELSE c.participant_a END AS other_id,
        ou.username, ou.display_name, ou.titles,
        NULL::timestamptz AS last_message_at, NULL::text AS last_body, NULL::bigint AS last_sender_id,
        c.created_at AS conv_created_at
      FROM conversations c
      JOIN users ou
        ON ou.id = CASE WHEN c.participant_a = $2::bigint THEN c.participant_b ELSE c.participant_a END
     WHERE c.id = $1::bigint
       AND (c.participant_a = $2::bigint OR c.participant_b = $2::bigint)`,
    [conversationId, userId],
  )) as { rows: ConversationWithOtherRow[] }
  return rows[0] ?? null
}

/** 按会话列出消息，时间倒序，键集游标基于 (created_at, id)。 */
export async function listMessages(
  conversationId: string,
  cursor: { t: string; id: string } | null,
  limit: number,
  executor: Executor = pool,
): Promise<MessageRow[]> {
  const { rows } = (await executor.query(
    `SELECT id, sender_id, body, created_at
       FROM messages
      WHERE conversation_id = $1::bigint
        AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::bigint))
      ORDER BY created_at DESC, id DESC
      LIMIT $4`,
    [conversationId, cursor?.t ?? null, cursor?.id ?? null, limit + 1],
  )) as { rows: MessageRow[] }
  return rows
}

/** 发送一条消息（sender 必须是参与者，由服务层先校验）。 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  executor: Executor = pool,
): Promise<MessageRow> {
  const { rows } = (await executor.query(
    `INSERT INTO messages (conversation_id, sender_id, body)
       VALUES ($1::bigint, $2::bigint, $3)
     RETURNING id, sender_id, body, created_at`,
    [conversationId, senderId, body],
  )) as { rows: MessageRow[] }
  return rows[0]!
}

/** 按用户名查收件人（仅未删除、未停用账号，与用户公开投影口径一致）。 */
export async function findUserByUsername(
  username: string,
  executor: Executor = pool,
): Promise<UserLookupRow | null> {
  const { rows } = (await executor.query(
    `SELECT id, username, display_name, titles
       FROM users
      WHERE username = $1 AND deleted_at IS NULL AND status <> 'suspended'`,
    [username],
  )) as { rows: UserLookupRow[] }
  return rows[0] ?? null
}
