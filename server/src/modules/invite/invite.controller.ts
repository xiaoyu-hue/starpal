// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { DomainError } from '../../shared/errors.js'
import { sendData } from '../../shared/response.js'
import { requireObject, requireString } from '../../shared/validation.js'
import { generateCodes, listCodes, revokeCode } from './invite.service.js'

/** 邀请码管理控制器：生成 / 列表 / 撤销，路由已统一挂载 requireAuth + requireRole(admin)。 */

function parseGenerateBody(body: unknown) {
  const obj = requireObject(body)
  const countRaw = typeof obj.count === 'number' ? obj.count : Number(obj.count)
  const count = Number.isInteger(countRaw) && countRaw > 0 ? countRaw : 1
  const note =
    obj.note === undefined ? undefined : requireString(obj.note, { field: 'note', min: 0, max: 200 })
  return { count, note }
}

function parseId(param: string): number {
  const id = Number(param)
  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('VALIDATION_FAILED', '非法的邀请码 id')
  }
  return id
}

export async function listInviteCodesController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendData(res, { items: await listCodes() })
  } catch (error) {
    next(error)
  }
}

export async function createInviteCodesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { count, note } = parseGenerateBody(req.body)
    const codes = await generateCodes(count, req.principal!.id, note)
    sendData(res, { codes })
  } catch (error) {
    next(error)
  }
}

export async function revokeInviteCodeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await revokeCode(parseId(String(req.params.id ?? '')))
    sendData(res, { revoked: true })
  } catch (error) {
    next(error)
  }
}
