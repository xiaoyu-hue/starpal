import type { NextFunction, Request, Response } from 'express'
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  HONEYPOT_FIELD,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from '../../config/constants.js'
import { sendData } from '../../shared/response.js'
import { honeypotFilled, requireObject, requireString } from '../../shared/validation.js'
import { currentUser, login, logout, register, type PublicUser } from './auth.service.js'
import { note } from './rate-limit.js'
import { clearSessionCookie, readSessionId, setSessionCookie } from './session.js'
import { subjectHashOf } from './subject.js'

/** 认证控制器：模式校验 → 服务层 → 统一包络。凭据不入日志（access-log 只记方法/路径）。 */

function parseRegisterBody(body: Record<string, unknown>) {
  return {
    username: requireString(body.username, {
      field: 'username', min: USERNAME_MIN, max: USERNAME_MAX,
      pattern: USERNAME_PATTERN, patternHint: '仅允许字母、数字、下划线',
    }),
    password: requireString(body.password, {
      field: 'password', min: PASSWORD_MIN, max: PASSWORD_MAX,
      allowInnerWhitespace: true,
    }),
    displayName: requireString(body.displayName ?? body.username, {
      field: 'displayName', min: DISPLAY_NAME_MIN, max: DISPLAY_NAME_MAX,
      trim: true, allowInnerWhitespace: true,
    }),
    inviteCode: requireString(body.inviteCode, {
      field: 'inviteCode', min: 1, max: 128,
    }),
  }
}

function parseLoginBody(body: Record<string, unknown>) {
  return {
    username: requireString(body.username, {
      field: 'username', min: USERNAME_MIN, max: USERNAME_MAX,
      pattern: USERNAME_PATTERN, patternHint: '仅允许字母、数字、下划线',
    }),
    password: requireString(body.password, {
      field: 'password', min: PASSWORD_MIN, max: PASSWORD_MAX,
      allowInnerWhitespace: true,
    }),
  }
}

/**
 * 蜜罐命中：记录事件，返回与真实注册「形状一致」的响应，但不创建账户、不设 Cookie。
 * 形状一致是为了让自动化脚本无法从响应差异里反推出防刷规则；
 * 真人不会填该字段（前端须以 aria-hidden / tabindex=-1 标注，避免辅助技术误判）。
 */
function honeypotResponse(res: Response, subjectHash: string, username: string): void {
  void note('honeypot', subjectHash).catch(() => undefined)
  sendData(res, {
    registered: true,
    user: {
      id: '0', username, displayName: username, role: 'user',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    },
  })
}

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = requireObject(req.body)
    const subjectHash = subjectHashOf(req)
    if (honeypotFilled(body, HONEYPOT_FIELD)) {
      const rawName = typeof body.username === 'string' ? body.username.slice(0, USERNAME_MAX) : 'guest'
      honeypotResponse(res, subjectHash, rawName)
      return
    }
    const input = parseRegisterBody(body)
    const user = await register({ ...input, subjectHash })
    sendData(res, { registered: true, user })
  } catch (error) {
    next(error)
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = requireObject(req.body)
    const subjectHash = subjectHashOf(req)
    const input = parseLoginBody(body)
    const { user, sessionId } = await login({ ...input, subjectHash })
    setSessionCookie(req, res, sessionId)
    sendData(res, { user })
  } catch (error) {
    next(error)
  }
}

export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await logout(readSessionId(req))
    clearSessionCookie(req, res)
    sendData(res, { loggedOut: true })
  } catch (error) {
    next(error)
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user: PublicUser = await currentUser(readSessionId(req))
    sendData(res, { user })
  } catch (error) {
    next(error)
  }
}
