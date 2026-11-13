import { createHmac } from 'node:crypto'
import type { Request } from 'express'
import { appEnv } from '../../config/env.js'

/**
 * 来源标识与安全请求判定。
 *
 * 依 PRD §4.3 附注：防刷与登录失败计数须以「不可逆摘要」标识来源，
 * 不长期保留原始网络地址。这里用 HMAC-SHA256(SESSION_SECRET, 来源材料)
 * 得到 64 位十六进制摘要，正好对应 security_events.subject_hash VARCHAR(64)。
 * 无密钥则无法从摘要反推 IP；轮换 SESSION_SECRET 会使历史摘要自然失效。
 */

/** 提取来源材料：优先平台注入的转发链首值，其次套接字地址，附加 UA 降碰撞。 */
function sourceMaterial(req: Request): string {
  const forwarded = req.header('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  const ua = req.header('user-agent') ?? 'unknown'
  return `${ip}|${ua}`
}

export function subjectHashOf(req: Request): string {
  return createHmac('sha256', appEnv.sessionSecret)
    .update(sourceMaterial(req))
    .digest('hex')
}

/**
 * 生产环境 Cookie 是否需要 Secure。
 *
 * 关键坑：Vercel 在边缘终止 HTTPS，函数看到的 req.secure 可能为 false。
 * 因此不能只看 req.secure，必须同时采信平台注入的 x-forwarded-proto。
 * 本地 http 开发时不加 Secure，否则浏览器会拒绝保存会话 Cookie。
 */
export function isSecureRequest(req: Request): boolean {
  const proto = req.header('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  if (proto === 'https') return true
  if (proto === 'http') return false
  return req.secure === true
}
