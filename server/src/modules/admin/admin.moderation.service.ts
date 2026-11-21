// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PoolClient } from 'pg'
import { ROLE_ADMIN } from '../../config/constants.js'
import { pool, withTransaction } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import { encodeCursor } from '../../shared/pagination.js'
import { insertLog, type ModerationAction } from '../moderation/index.js'
import type { AdminListQuery } from './admin.schema.js'
import {
  findContentById,
  findUserById,
  listContent,
  listUsers,
  setContentStatus,
  setUserStatus,
} from './admin.moderation.repository.js'
import type {
  AdminActor,
  AdminContentItem,
  AdminPage,
  AdminUserItem,
  ContentStatusTarget,
  Executor,
  UserStatusTarget,
} from './admin.types.js'

/**
 * 管理端治理业务层：权限复核、分页编排，以及「状态变更 + 审核日志」的原子提交。
 *
 * 双轨执行器与举报模块同款：不传 executor 时用 withTransaction 包住（生产），
 * 传入时直接在注入执行器内完成两步（测试用 PGlite）。绝不允许「改了状态没留痕」
 * 或「留了痕没改状态」——两者共用同一连接、同一步提交。
 */

function assertAdmin(actor: AdminActor): void {
  if (actor.role !== ROLE_ADMIN) {
    throw new DomainError('FORBIDDEN', '无权访问该资源')
  }
}

function pageOf<T extends { id: number; createdAt: string }>(
  items: T[],
  hasMore: boolean,
): AdminPage<T> {
  const last = items[items.length - 1]
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({ t: last.createdAt, id: String(last.id) }) : null,
  }
}

export async function listAdminUsers(
  actor: AdminActor,
  query: AdminListQuery,
  executor?: Executor,
): Promise<AdminPage<AdminUserItem>> {
  assertAdmin(actor)
  const { rows, hasMore } = await listUsers(query.cursor, query.limit, executor ?? pool)
  return pageOf(rows, hasMore)
}

/** 用户状态变更 + 日志。目标不存在 / 不可翻转时抛 NOT_FOUND，不写日志。 */
export async function changeUserStatus(
  actor: AdminActor,
  id: number,
  target: UserStatusTarget,
  executor?: Executor,
): Promise<AdminUserItem> {
  assertAdmin(actor)
  const work = async (ex: Executor): Promise<AdminUserItem> => {
    // 自锁保护（第三次攻防 F6）：管理员不能停用自己。
    // 为什么这一条同时守住了「最后一名管理员」：能让 active 管理员数归零的唯一操作，
    // 就是某个管理员停用自己——只要目标是别人，操作者本人仍是 active 管理员，
    // 至少剩 1 个。因此不必额外数在岗管理员（那反而会误伤「重复停用管理员」的幂等请求）。
    // 仅在停用时校验——恢复账号（active）不构成锁定，保持幂等语义不变。
    if (target === 'suspended' && Number(actor.id) === id) {
      throw new DomainError('FORBIDDEN', '不能停用当前账号')
    }
    const item = await setUserStatus(id, target, ex)
    if (!item) {
      // 幂等：已是目标态则回现状，不重复写日志；真不存在（或 deleted 态）才报错。
      const current = await findUserById(id, ex)
      if (current && current.status === target) return current
      throw new DomainError('NOT_FOUND', '用户不存在或状态不可变更')
    }
    await insertLog(
      {
        actorId: actor.id,
        action: target === 'suspended' ? 'user.suspend' : 'user.restore',
        targetType: 'user',
        targetId: id,
        metadata: { username: item.username, status: item.status },
      },
      ex,
    )
    return item
  }
  return runAtomic(work, executor)
}

export async function listAdminContent(
  actor: AdminActor,
  kind: 'post' | 'comment',
  query: AdminListQuery,
  executor?: Executor,
): Promise<AdminPage<AdminContentItem>> {
  assertAdmin(actor)
  const { rows, hasMore } = await listContent(kind, query.cursor, query.limit, executor ?? pool)
  return pageOf(rows, hasMore)
}

/** 内容状态变更 + 日志 + 评论计数联动。全部在同一执行器内完成。 */
export async function changeContentStatus(
  actor: AdminActor,
  kind: 'post' | 'comment',
  id: number,
  target: ContentStatusTarget,
  executor?: Executor,
): Promise<AdminContentItem> {
  assertAdmin(actor)
  const work = async (ex: Executor): Promise<AdminContentItem> => {
    const item = await setContentStatus(kind, id, target, ex)
    if (!item) {
      // 幂等：已是目标态则回现状，不重复写日志、不再动计数；真不存在才报错。
      const current = await findContentById(kind, id, ex)
      if (current && current.status === target) return current
      throw new DomainError('NOT_FOUND', '内容不存在或状态不可变更')
    }
    const action: ModerationAction = kind === 'post'
      ? target === 'removed' ? 'post.remove' : 'post.restore'
      : target === 'removed' ? 'comment.remove' : 'comment.restore'
    await insertLog(
      {
        actorId: actor.id,
        action,
        targetType: kind,
        targetId: id,
        metadata: { postId: item.postId, status: item.status },
      },
      ex,
    )
    return item
  }
  return runAtomic(work, executor)
}

/** 有注入执行器则直接复用（测试），否则开启数据库事务（生产）。 */
async function runAtomic<T>(work: (ex: Executor) => Promise<T>, executor?: Executor): Promise<T> {
  if (executor) return work(executor)
  return withTransaction((client: PoolClient) => work(client))
}
