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
 * 取转发链的「最右一跳」——离我们最近的、由平台写入的值。
 *
 * 为什么取最右而不是最左：
 * - `x-forwarded-for` 的形态是 `客户端, 代理1, 代理2 …`，**左侧完全由请求方控制**，
 *   攻击者随手填 `1.2.3.4` 就能构造任意首值；右侧才是最近一跳写入的可信值。
 * - Vercel 官方 Request headers 文档明确：Vercel 会 override `x-forwarded-for`
 *   为真实客户端 IP，且不转发外部传入的同名头，理由是防 IP 伪造。此时链上只有
 *   一个值，取最右与取最左等价，不改变线上行为。
 * - 一旦平台改为「追加」模式，或有人在 Vercel 之上又前置了一层代理，最左就变成
 *   伪造值、限流可被绕过（威胁模型 A1）。取最右在两种模式下都成立，因此本实现
 *   不依赖任何单一平台假设。
 */
function lastHop(value: string | undefined): string | undefined {
  if (!value) return undefined
  const hops = value
    .split(',')
    .map((hop) => hop.trim())
    .filter((hop) => hop.length > 0)
  return hops.length === 0 ? undefined : hops[hops.length - 1]
}

/**
 * 提取客户端 IP 作为限流来源材料。本地开发（无转发头）回退到套接字地址。
 *
 * 关键：绝不把 User-Agent 计入摘要。UA 完全由客户端控制，攻击者每发一个请求就换一个
 * UA 即可得到全新摘要，使所有基于摘要的限流（登录失败限次、注册、ALTCHA 挑战、
 * 发帖/评论/举报/上传四类写接口）形同虚设。IP 摘要才是不可伪造的来源标识。
 */
function sourceMaterial(req: Request): string {
  return lastHop(req.header('x-forwarded-for')) || req.socket?.remoteAddress || 'unknown'
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
