// SPDX-License-Identifier: AGPL-3.0-or-later
import type {
  AdminTopicInput,
  AdminTopicItem,
  Executor,
  TopicUpdateInput,
} from './topic.admin.types.js'

/**
 * 话题管理仓储：列表含已归档项，创建 / 编辑 / 归档软删除。
 * 归档用 deleted_at（与公开列表的 `WHERE deleted_at IS NULL` 对齐），不物理删除——
 * 话题下挂着帖子，删除会让帖子失去分类。接受 Executor 注入，与步 3 同款双轨。
 * slug 唯一、格式、名称非空的兜底由数据库 CHECK / UNIQUE 提供（迁移 003）。
 */

const ADMIN_TOPIC_COLUMNS = `id, slug, name_zh, name_en, description, icon,
                             sort_order, is_demo, created_at, deleted_at`

type TopicRow = Record<string, unknown> & { created_at: Date | string }

function toItem(r: TopicRow): AdminTopicItem {
  return {
    id: Number(r.id),
    slug: String(r.slug),
    nameZh: String(r.name_zh),
    nameEn: String(r.name_en),
    description: r.description === null || r.description === undefined ? null : String(r.description),
    icon: r.icon === null || r.icon === undefined ? null : String(r.icon),
    sortOrder: Number(r.sort_order),
    isDemo: Boolean(r.is_demo),
    archived: r.deleted_at !== null && r.deleted_at !== undefined,
    createdAt: new Date(r.created_at).toISOString(),
  }
}

/** 管理端话题列表：含已归档，按排序值再按 id，全量返回（话题数量小，无需分页）。 */
export async function listTopicsForAdmin(executor: Executor): Promise<AdminTopicItem[]> {
  const result = await executor.query(
    `SELECT ${ADMIN_TOPIC_COLUMNS} FROM topics ORDER BY sort_order ASC, id ASC`,
    [],
  )
  return (result.rows as TopicRow[]).map(toItem)
}

/** 创建话题；slug 冲突由唯一约束抛出，服务层归一为 CONFLICT。 */
export async function insertTopic(
  input: AdminTopicInput,
  createdBy: string,
  executor: Executor,
): Promise<AdminTopicItem> {
  const result = await executor.query(
    `INSERT INTO topics (slug, name_zh, name_en, description, icon, sort_order, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${ADMIN_TOPIC_COLUMNS}`,
    [
      input.slug,
      input.nameZh,
      input.nameEn,
      input.description,
      input.icon,
      input.sortOrder,
      createdBy,
    ],
  )
  return toItem(result.rows[0] as TopicRow)
}

/** 编辑话题：只改可运营字段，不动 is_demo / created_by / 归档态。 */
export async function updateTopic(
  id: number,
  input: TopicUpdateInput,
  executor: Executor,
): Promise<AdminTopicItem | null> {
  const result = await executor.query(
    `UPDATE topics
        SET name_zh = $2, name_en = $3, description = $4, icon = $5, sort_order = $6,
            updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING ${ADMIN_TOPIC_COLUMNS}`,
    [id, input.nameZh, input.nameEn, input.description, input.icon, input.sortOrder],
  )
  const r = result.rows[0] as TopicRow | undefined
  return r ? toItem(r) : null
}

/** 归档（软删）：deleted_at = now()；恢复：deleted_at = NULL。按目标态条件更新保证幂等。 */
export async function setTopicArchived(
  id: number,
  archived: boolean,
  executor: Executor,
): Promise<AdminTopicItem | null> {
  const result = await executor.query(
    archived
      ? `UPDATE topics SET deleted_at = now(), updated_at = now()
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING ${ADMIN_TOPIC_COLUMNS}`
      : `UPDATE topics SET deleted_at = NULL, updated_at = now()
          WHERE id = $1 AND deleted_at IS NOT NULL
          RETURNING ${ADMIN_TOPIC_COLUMNS}`,
    [id],
  )
  const r = result.rows[0] as TopicRow | undefined
  return r ? toItem(r) : null
}

/** 按 id 取当前话题，供归档幂等判断：区分「已是目标态」与「真不存在」。 */
export async function findTopicById(
  id: number,
  executor: Executor,
): Promise<AdminTopicItem | null> {
  const result = await executor.query(
    `SELECT ${ADMIN_TOPIC_COLUMNS} FROM topics WHERE id = $1`,
    [id],
  )
  const r = result.rows[0] as TopicRow | undefined
  return r ? toItem(r) : null
}
