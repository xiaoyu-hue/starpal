// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'

/**
 * 安全响应头：禁止类型嗅探、限制内嵌、收紧来源信息。
 *
 * 刻意不在此处设置 HSTS：线上由 Vercel 平台统一注入（`max-age=63072000`），
 * 应用层再加会产生重复头；本地是 HTTP，加 HSTS 既无效又可能被浏览器记住。
 * 平台注入这一事实已用 `curl -sSI https://starpal.cc.cd/api/health` 实测确认。
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  // 本项目不使用摄像头、定位、支付等设备能力，一律关闭以缩小攻击面。
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), ' +
      'bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=(), autoplay=()',
  )
  // 前端资源全部同源（CSP 已限制 script-src 'self'）；跨源隔离头不影响现有功能。
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.setHeader('X-Powered-By', '')
  res.removeHeader('X-Powered-By')
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
      "script-src 'self'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
  )
  next()
}
