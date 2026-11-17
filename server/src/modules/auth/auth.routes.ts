// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth.js'
import {
  challengeController,
  changePasswordController,
  loginController,
  logoutController,
  meController,
  registerController,
} from './auth.controller.js'
import { requireAltcha } from './require-altcha.js'

/**
 * 认证路由（挂载于 /api/auth）。
 * challenge / register / login 为访客端点，其中 register / login 前置人机验证守卫；
 * logout / me 需有效会话，
 * 由控制器内的 currentUser / logout 自行校验，未登录返回统一 AUTH_REQUIRED 包络。
 * change-password 为登录态敏感操作，单独挂 requireAuth 以取得 req.principal。
 */
export const authRouter = Router()

authRouter.get('/challenge', challengeController)
// 注册 / 登录前置人机验证：守卫失败即 400，不进入业务层。
authRouter.post('/register', requireAltcha, registerController)
authRouter.post('/login', requireAltcha, loginController)
authRouter.post('/logout', logoutController)
authRouter.get('/me', meController)
authRouter.post('/change-password', requireAuth, changePasswordController)
