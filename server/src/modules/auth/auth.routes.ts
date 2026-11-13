import { Router } from 'express'
import {
  loginController,
  logoutController,
  meController,
  registerController,
} from './auth.controller.js'

/**
 * 认证路由（挂载于 /api/auth）。
 * register / login 为访客端点；logout / me 需有效会话，
 * 由控制器内的 currentUser / logout 自行校验，未登录返回统一 AUTH_REQUIRED 包络。
 */
export const authRouter = Router()

authRouter.post('/register', registerController)
authRouter.post('/login', loginController)
authRouter.post('/logout', logoutController)
authRouter.get('/me', meController)
