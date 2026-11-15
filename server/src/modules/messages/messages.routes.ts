// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth.js'
import {
  createConversationController,
  getConversationController,
  listConversationsController,
  listMessagesController,
  sendMessageController,
} from './messages.controller.js'

/**
 * 私信路由（挂载于 /api/messages）。
 *
 * 整组统一挂 requireAuth：私信是私密内容，任何端点都必须先登录，
 * 新增端点自动受保护，不依赖逐端点记得挂守卫。
 * 参与者校验在服务层二次确认（getConversationFor 非参与者返回 FORBIDDEN），
 * 即使路由层遗漏，数据边界也不会被越权读取。
 */
export const messageRouter = Router()

messageRouter.use(requireAuth)
messageRouter.post('/', createConversationController)
messageRouter.get('/', listConversationsController)
messageRouter.get('/:id', getConversationController)
messageRouter.get('/:id/messages', listMessagesController)
messageRouter.post('/:id/messages', sendMessageController)
