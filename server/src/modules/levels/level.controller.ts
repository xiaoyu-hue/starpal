// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { DomainError } from '../../shared/errors.js'
import { sendData } from '../../shared/response.js'
import { getLevel, setOwnRank } from './level.service.js'

/** 等级控制器：与成就时间线同属公开读取，不区分登录态。 */

/** 用户名上限与 users.username VARCHAR(32) 一致，超长按不存在处理，不查库。 */
const USERNAME_MAX = 32

export async function levelController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const username = String(req.params.username ?? '')
    if (username.length === 0 || username.length > USERNAME_MAX) {
      throw new DomainError('NOT_FOUND', '用户不存在')
    }
    sendData(res, await getLevel(username))
  } catch (error) {
    next(error)
  }
}

/**
 * 设置自己佩戴的段位（`PATCH /api/users/me/rank`）。
 *
 * 挂在 `users/me` 下而不是 `levels/me`：这是一条「改我自己的资料」的写操作，
 * 与 `PATCH /me/titles` 同属一类，路由归口在 users，逻辑留在 levels。
 */
export async function updateRankController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as { rank?: unknown } | null
    sendData(res, await setOwnRank(req.principal!.id, body?.rank))
  } catch (error) {
    next(error)
  }
}
