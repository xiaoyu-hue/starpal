// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { DomainError } from '../../shared/errors.js'
import { getTimeline, getWeekly } from './achievement.service.js'

/** 成就控制器：成就页与资料页徽章均为公开读取，不区分登录态；登录态只影响帖子互动态标记。 */

/** 用户名上限与 users.username VARCHAR(32) 一致，超长直接按不存在处理，不查库。 */
const USERNAME_MAX = 32

export async function timelineController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const username = String(req.params.username ?? '')
    if (username.length === 0 || username.length > USERNAME_MAX) {
      throw new DomainError('NOT_FOUND', '用户不存在')
    }
    const view = await getTimeline(username)
    sendData(res, view)
  } catch (error) {
    next(error)
  }
}

export async function weeklyController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const view = await getWeekly(req.principal ?? null)
    sendData(res, view)
  } catch (error) {
    next(error)
  }
}
