// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { DomainError } from '../../shared/errors.js'
import { buildBundle, fileNameOf, renderMarkdown } from './export.service.js'
import type { ExportFormat } from './export.types.js'

/**
 * 只接受 `json` / `md` 两个值。不传时默认 json（机器可读更适合「备份」用途）；
 * 传了其他值直接 400，不静默降级——静默兜底会让调用方以为拿到了想要的东西。
 */
function parseFormat(value: unknown): ExportFormat {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === undefined || raw === '') return 'json'
  if (raw === 'json' || raw === 'md') return raw
  throw new DomainError('VALIDATION_FAILED', 'format 只支持 json 或 md', [
    { field: 'format', constraint: 'oneof' },
  ])
}

/**
 * 导出接口：`GET /api/export?format=md|json`。
 *
 * 直接写响应体而不是走 `sendData` 包络：导出物是一个**文件**，顶层必须直接是
 * `{ user, posts, comments }`，包一层 `data` 会让 `scripts/export-check.mjs`
 * 与任何外部工具都读不出结构。
 *
 * 图片引用用请求来源拼成绝对地址，导出文件离线打开也能看清图在哪；Host 取自请求头，
 * 伪造它只会影响伪造者自己下载到的文件内容，不构成越权。
 */
export async function exportController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const format = parseFormat(req.query.format)
    const principal = req.principal
    if (!principal) {
      throw new DomainError('AUTH_REQUIRED', '请先登录')
    }

    const host = req.get('host')
    const baseUrl = host ? `${req.protocol}://${host}` : ''
    const bundle = await buildBundle(principal.id, baseUrl)

    const body = format === 'md' ? renderMarkdown(bundle) : JSON.stringify(bundle, null, 2)
    const contentType =
      format === 'md' ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${fileNameOf(bundle, format)}"`)
    // 个人数据不进任何中间缓存，也不留在浏览器缓存里。
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.status(200).send(body)
  } catch (error) {
    next(error)
  }
}
