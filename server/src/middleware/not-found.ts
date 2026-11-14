// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Request, Response } from 'express'
import { sendError } from '../shared/response.js'
import { requestIdOf } from '../shared/types.js'

/** 未匹配的 /api 路径返回统一错误包络，不回退到前端页面。 */
export function apiNotFound(req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', '请求的资源不存在', requestIdOf(req))
}
