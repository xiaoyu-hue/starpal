// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth.js'
import { appEnv } from '../../config/env.js'
import { writeRateLimit } from '../auth/index.js'
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
// D-1：私信发送挂独立写限流（30 条 / 60 秒，见 env 默认值）。
// 只拦短时间刷屏，正常密集聊天配额充足；沿用来源摘要计数，Serverless 多实例一致。
messageRouter.post(
  '/:id/messages',
  writeRateLimit('message_send', {
    max: appEnv.messageSendMax,
    windowSeconds: appEnv.messageSendWindowSeconds,
  }),
  sendMessageController,
)
