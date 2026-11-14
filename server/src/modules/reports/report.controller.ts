// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import {
  parseDecisionInput,
  parseListQuery,
  parseReportId,
  parseSubmitInput,
} from './report.schema.js'
import { decideOnReport, getMyReports, getReportQueue, submitReport } from './report.service.js'

/**
 * 举报 / 申诉控制器：只做「解析 → 服务 → 统一包络」。
 * 身份一律取守卫挂载的 req.principal，不采信请求体里的任何用户标识。
 */

function actorOf(req: Request) {
  const principal = req.principal!
  return { id: principal.id, role: principal.role }
}

export async function submitReportController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await submitReport(actorOf(req), parseSubmitInput(req.body))
    sendData(res, item)
  } catch (error) {
    next(error)
  }
}

export async function myReportsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = await getMyReports(actorOf(req), parseListQuery(req.query as Record<string, unknown>))
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}

/** 管理队列：路由已统一挂载 requireAuth + requireRole(admin)，服务层再复核一次。 */
export async function adminReportsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = await getReportQueue(actorOf(req), parseListQuery(req.query as Record<string, unknown>))
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}

export async function decideReportController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await decideOnReport(
      actorOf(req),
      parseReportId(req.params.id),
      parseDecisionInput(req.body),
    )
    sendData(res, item)
  } catch (error) {
    next(error)
  }
}
