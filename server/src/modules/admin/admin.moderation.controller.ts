// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import {
  parseAdminId,
  parseAdminListQuery,
  parseContentKind,
  parseContentStatusTarget,
  parseUserStatusTarget,
} from './admin.schema.js'
import {
  changeContentStatus,
  changeUserStatus,
  listAdminContent,
  listAdminUsers,
} from './admin.moderation.service.js'
import type { AdminActor } from './admin.types.js'

/**
 * 管理端治理控制器：只做「解析 → 服务 → 统一包络」。
 * 身份一律取守卫挂载的 req.principal，不采信请求体里的任何用户标识。
 * 路由已统一挂载 requireAuth + requireRole(admin)，服务层仍二次复核。
 */

function actorOf(req: Request): AdminActor {
  const principal = req.principal!
  return { id: principal.id, role: principal.role }
}

function queryOf(req: Request) {
  return parseAdminListQuery(req.query as Record<string, unknown>)
}

export async function adminUsersController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = await listAdminUsers(actorOf(req), queryOf(req))
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}

export async function adminSetUserStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await changeUserStatus(
      actorOf(req),
      parseAdminId(req.params.id),
      parseUserStatusTarget(req.body),
    )
    sendData(res, item)
  } catch (error) {
    next(error)
  }
}

export async function adminContentController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = await listAdminContent(actorOf(req), parseContentKind(req.params.kind), queryOf(req))
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}

export async function adminSetContentStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await changeContentStatus(
      actorOf(req),
      parseContentKind(req.params.kind),
      parseAdminId(req.params.id),
      parseContentStatusTarget(req.body),
    )
    sendData(res, item)
  } catch (error) {
    next(error)
  }
}
