// SPDX-License-Identifier: AGPL-3.0-or-later
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
import { DomainError } from '../../shared/errors.js'
import { sendData } from '../../shared/response.js'
import { honeypotFilled, requireObject, requireString } from '../../shared/validation.js'
import { newChallenge } from './altcha.js'
import { changePassword, currentUser, login, logout, register, type PublicUser } from './auth.service.js'
import { enforceRateLimit, note } from './rate-limit.js'
import { clearSessionCookie, readSessionId, setSessionCookie } from './session.js'
import { subjectHashOf } from './subject.js'

/** 认证控制器：模式校验 → 服务层 → 统一包络。凭据不入日志（access-log 只记方法/路径）。 */

/**
 * 人机验证挑战：公开端点，返回供 widget 求解的一次性挑战。
 * 生成有成本，按来源限流，避免被当作免费算力池刷。
 */
export async function challengeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await enforceRateLimit('altcha_challenge', subjectHashOf(req))
    const challenge = await newChallenge()
    sendData(res, { challenge })
  } catch (error) {
    next(error)
  }
}

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
    /**
     * 同意条款：只认严格的 true，其余一律视为未同意。
     * 不作为准入条件（前端已强制勾选，服务端再拒会误伤脚本化注册与回归测试），
     * 但传了就必须留下记录——否则日后无法证明用户同意过哪一版协议。
     */
    acceptedTerms: body.acceptTerms === true,
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

/** 改密：新旧口令都走与注册一致的强度口径；新口令不得与旧口令相同由前端提示、服务端不强判。 */
function parseChangePasswordBody(body: Record<string, unknown>) {
  return {
    currentPassword: requireString(body.currentPassword, {
      field: 'currentPassword', min: PASSWORD_MIN, max: PASSWORD_MAX,
      allowInnerWhitespace: true,
    }),
    newPassword: requireString(body.newPassword, {
      field: 'newPassword', min: PASSWORD_MIN, max: PASSWORD_MAX,
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

/** 改密：requireAuth 已保证登录态与 req.principal；会话标识只在服务端读取，不采信请求体。 */
export async function changePasswordController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = requireObject(req.body)
    const input = parseChangePasswordBody(body)
    const sessionId = readSessionId(req)
    if (!sessionId) throw new DomainError('AUTH_REQUIRED', '请先登录')
    await changePassword({
      userId: req.principal!.id,
      sessionId,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      subjectHash: subjectHashOf(req),
    })
    sendData(res, { changed: true })
  } catch (error) {
    next(error)
  }
}
