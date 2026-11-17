// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { avatarController } from './avatar.controller.js'

/**
 * 头像路由（挂载于 `/api/avatars`）。
 *
 * `GET /api/avatars/:style?seed=...`：按风格与种子确定性生成 SVG。
 * 无认证、无数据库访问——纯计算，风格与种子都经过白名单 / 格式校验。
 * 与 `/api/images` 分开：后者读库里的不可变字节，前者实时生成，性质不同。
 */
export const avatarRouter = Router()

avatarRouter.get('/:style', avatarController)
