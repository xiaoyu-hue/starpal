// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { levelController } from './level.controller.js'

/**
 * 等级路由（挂载于 /api/levels）。
 *
 * 公开可读：等级与个人资料同属「谁都能看」的范畴。
 * 路径用 `/levels/:username` 而不是塞进 `/users/:username`：等级接口有读时写副作用
 * （晋级时抬 `top_level`），与只读的资料投影分开，方便单独观察与限流。
 */
export const levelRouter = Router()

levelRouter.get('/:username', levelController)
