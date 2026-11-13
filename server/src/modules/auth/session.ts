import { randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'
import {
  SESSION_COOKIE,
  SESSION_ID_BYTES,
} from '../../config/constants.js'
import { appEnv } from '../../config/env.js'
import { isSecureRequest } from './subject.js'

/**
 * 会话 Cookie 层。会话本体存于 sessions 表，Cookie 只承载不透明随机标识。
 * 不引入 cookie-parser：手写解析，保持依赖最小化（ADR-013）。
 */

/** 256 位随机标识，base64url 编码，落入 VARCHAR(64) 无压力。 */
export function newSessionId(): string {
  return randomBytes(SESSION_ID_BYTES).toString('base64url')
}

/** 从 Cookie 头读取会话标识；缺失或畸形返回 null。 */
export function readSessionId(req: Request): string | null {
  const raw = req.header('cookie')
  if (!raw) return null
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() !== SESSION_COOKIE) continue
    const value = part.slice(eq + 1).trim()
    // 只接受合法 base64url 标识，避免把任意字符串送进数据库查询
    return /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null
  }
  return null
}

/** 设置会话 Cookie：HttpOnly + SameSite=Lax + 生产环境 Secure。 */
export function setSessionCookie(req: Request, res: Response, id: string): void {
  const maxAgeSeconds = appEnv.sessionTtlHours * 3600
  const attrs = [
    `${SESSION_COOKIE}=${id}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (isSecureRequest(req)) attrs.push('Secure')
  res.setHeader('Set-Cookie', attrs.join('; '))
}

/** 清除会话 Cookie：同名、同 Path、立即过期，属性与设置时保持一致。 */
export function clearSessionCookie(req: Request, res: Response): void {
  const attrs = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (isSecureRequest(req)) attrs.push('Secure')
  res.setHeader('Set-Cookie', attrs.join('; '))
}

/** 会话过期时间点。 */
export function sessionExpiresAt(): Date {
  return new Date(Date.now() + appEnv.sessionTtlHours * 3600 * 1000)
}
