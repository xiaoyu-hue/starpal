// SPDX-License-Identifier: AGPL-3.0-or-later
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

/**
 * 提取客户端 IP 作为限流来源材料。
 *
 * Vercel 官方会覆盖 x-forwarded-for 为真实客户端公网 IP，且不转发外部传入的同名头
 * （明确说明此限制是为防 IP 伪造），因此转发链首值可信；本地开发回退到套接字地址。
 *
 * 关键：绝不把 User-Agent 计入摘要。UA 完全由客户端控制，攻击者每发一个请求就换一个
 * UA 即可得到全新摘要，使所有基于摘要的限流（登录失败限次、注册、ALTCHA 挑战、
 * 发帖/评论/举报/上传四类写接口）形同虚设。IP 摘要才是不可伪造的来源标识。
 */
function sourceMaterial(req: Request): string {
  const forwarded = req.header('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
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
