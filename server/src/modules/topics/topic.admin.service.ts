// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import type { PoolClient } from 'pg'
import { ROLE_ADMIN } from '../../config/constants.js'
import { pool, withTransaction } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import { sendData } from '../../shared/response.js'
import { insertLog } from '../moderation/index.js'
import {
  findTopicById,
  insertTopic,
  listTopicsForAdmin,
  setTopicArchived,
  updateTopic,
} from './topic.admin.repository.js'
import {
  parseArchiveInput,
  parseCreateTopicInput,
  parseTopicId,
  parseUpdateTopicInput,
} from './topic.admin.schema.js'
import type {
  AdminTopicInput,
  AdminTopicItem,
  Executor,
  TopicUpdateInput,
} from './topic.admin.types.js'

/**
 * 话题管理业务层 + 控制器：权限复核、slug 冲突归一、写审核日志。
 * 与步 3 同款双轨：不传 executor 用 withTransaction（生产），传入则直接复用（测试）。
 */

function assertAdmin(actor: { id: string; role: string }): void {
  if (actor.role !== ROLE_ADMIN) {
    throw new DomainError('FORBIDDEN', '无权访问该资源')
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  )
}

async function logAction(
  ex: Executor,
  actorId: string,
  action: 'topic.create' | 'topic.update' | 'topic.archive',
  topic: AdminTopicItem,
): Promise<void> {
  await insertLog(
    {
      actorId,
      action,
      targetType: 'topic',
      targetId: topic.id,
      metadata: { slug: topic.slug, nameZh: topic.nameZh },
    },
    ex,
  )
}

async function runAtomic<T>(work: (ex: Executor) => Promise<T>, executor?: Executor): Promise<T> {
  if (executor) return work(executor)
  return withTransaction((client: PoolClient) => work(client))
}

export async function adminListTopics(
  actor: { id: string; role: string },
  executor?: Executor,
): Promise<AdminTopicItem[]> {
  assertAdmin(actor)
  return listTopicsForAdmin(executor ?? pool)
}

export async function adminCreateTopic(
  actor: { id: string; role: string },
  input: AdminTopicInput,
  executor?: Executor,
): Promise<AdminTopicItem> {
  assertAdmin(actor)
  const work = async (ex: Executor): Promise<AdminTopicItem> => {
    let created: AdminTopicItem
    try {
      created = await insertTopic(input, actor.id, ex)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError('CONFLICT', '该 slug 已被使用')
      }
      throw error
    }
    await logAction(ex, actor.id, 'topic.create', created)
    return created
  }
  return runAtomic(work, executor)
}

export async function adminUpdateTopic(
  actor: { id: string; role: string },
  id: number,
  input: TopicUpdateInput,
  executor?: Executor,
): Promise<AdminTopicItem> {
  assertAdmin(actor)
  const work = async (ex: Executor): Promise<AdminTopicItem> => {
    const updated = await updateTopic(id, input, ex)
    if (!updated) throw new DomainError('NOT_FOUND', '话题不存在或已归档')
    await logAction(ex, actor.id, 'topic.update', updated)
    return updated
  }
  return runAtomic(work, executor)
}

export async function adminSetTopicArchived(
  actor: { id: string; role: string },
  id: number,
  archived: boolean,
  executor?: Executor,
): Promise<AdminTopicItem> {
  assertAdmin(actor)
  const work = async (ex: Executor): Promise<AdminTopicItem> => {
    const result = await setTopicArchived(id, archived, ex)
    if (!result) {
      const current = await findTopicById(id, ex)
      if (current && current.archived === archived) return current
      throw new DomainError('NOT_FOUND', '话题不存在')
    }
    await logAction(ex, actor.id, 'topic.archive', result)
    return result
  }
  return runAtomic(work, executor)
}

// ---- 控制器 ----

function actorOf(req: Request): { id: string; role: string } {
  const principal = req.principal!
  return { id: principal.id, role: principal.role }
}

export async function adminTopicsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendData(res, await adminListTopics(actorOf(req)))
  } catch (error) {
    next(error)
  }
}

export async function adminCreateTopicController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendData(res, await adminCreateTopic(actorOf(req), parseCreateTopicInput(req.body)))
  } catch (error) {
    next(error)
  }
}

export async function adminUpdateTopicController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendData(
      res,
      await adminUpdateTopic(actorOf(req), parseTopicId(req.params.id), parseUpdateTopicInput(req.body)),
    )
  } catch (error) {
    next(error)
  }
}

export async function adminSetTopicArchivedController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendData(
      res,
      await adminSetTopicArchived(
        actorOf(req),
        parseTopicId(req.params.id),
        parseArchiveInput(req.body),
      ),
    )
  } catch (error) {
    next(error)
  }
}
