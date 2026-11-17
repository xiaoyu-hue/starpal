// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { generateAvatarSvg } from './avatar.service.js'
import { AVATAR_STYLES } from '../../config/avatar-styles.js'
import { sendData } from '../../shared/response.js'

/**
 * 头像 SVG 的安全响应头。
 *
 * SVG 是能承载脚本的 XML，即使本次生成器输出已实测无 <script>，仍按最坏情况设防：
 * - CSP `sandbox` + `default-src 'none'`：把它关进沙箱，禁止任何脚本与外链；
 *   `style-src 'unsafe-inline'` 仅因 DiceBear 生成的 SVG 带内联 <style>。
 * - nosniff：禁止浏览器把响应当 HTML 嗅探。
 * - Content-Disposition inline：允许作为 <img> 内嵌显示（配合沙箱是安全的）。
 */
const AVATAR_SECURITY_HEADERS = {
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  'Content-Disposition': 'inline',
  // 同一风格 + 种子永远生成同一张图，内容不可变，可长缓存。
  'Cache-Control': 'public, max-age=31536000, immutable',
} as const

/** 风格清单（含署名信息）：前端选择器与署名页的唯一数据来源。 */
export function avatarStylesController(_req: Request, res: Response): void {
  sendData(res, AVATAR_STYLES)
}

/** 头像生成控制器：风格与种子来自 URL，输出裸 SVG（非 JSON 包络）。 */
export function avatarController(req: Request, res: Response, next: NextFunction): void {
  try {
    const style = String(req.params.style ?? '')
    const seed = String(req.query.seed ?? '')
    const svg = generateAvatarSvg(style, seed)
    for (const [key, value] of Object.entries(AVATAR_SECURITY_HEADERS)) {
      res.setHeader(key, value)
    }
    res.status(200).send(svg)
  } catch (error) {
    next(error)
  }
}
