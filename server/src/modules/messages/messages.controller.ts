// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { requireObject } from '../../shared/validation.js'
import {
  createConversation,
  getConversationFor,
  listConversationsFor,
  listMessagesFor,
  sendMessageIn,
} from './messages.service.js'
import { parseListQuery, parseMessageBody, parseUsername } from './messages.schema.js'

/** 私信控制器：解析 → 服务 → 统一分页包络。所有端点已统一挂 requireAuth（见 messages.routes.ts）。 */

export async function createConversationController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = requireObject(req.body)
    const username = parseUsername(body.username)
    const view = await createConversation(req.principal!.id, username)
    sendData(res, view)
  } catch (error) {
    next(error)
  }
}

export async function listConversationsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { limit, cursor } = parseListQuery(req.query as Record<string, unknown>)
    const page = await listConversationsFor(req.principal!.id, cursor, limit)
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}

export async function getConversationController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const view = await getConversationFor(req.principal!.id, String(req.params.id))
    sendData(res, view)
  } catch (error) {
    next(error)
  }
}

export async function listMessagesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { limit, cursor } = parseListQuery(req.query as Record<string, unknown>)
    const page = await listMessagesFor(req.principal!.id, String(req.params.id), cursor, limit)
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}

export async function sendMessageController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = requireObject(req.body)
    const text = parseMessageBody(body.body)
    const item = await sendMessageIn(req.principal!.id, String(req.params.id), text)
    sendData(res, item)
  } catch (error) {
    next(error)
  }
}
