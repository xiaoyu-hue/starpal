import type { NextFunction, Request, Response } from 'express'
import { loadImage } from './image.service.js'

/**
 * 缓存策略：1 小时公共缓存。
 *
 * 图片键随机、内容不可变，本可设一年 `immutable`；但**键不可变不代表可用性不可变**——
 * 作者删图后，长缓存会让旧 URL 在 CDN 与浏览器里继续可读，等于「删了还在」。
 * 一小时足以覆盖一次浏览内的重复请求（正常滚动每张图只取一次），又让删除在可接受时间内生效。
 * 若将来图片量增长到需要更强缓存，提高此值即可，但须同时接受删除延迟。
 */
const IMAGE_CACHE_CONTROL = 'public, max-age=3600'

/**
 * 图片读取控制器：直接返回二进制，不套 `{ data }` 包络。
 * 失败仍交由统一错误中间件，返回 JSON 包络——图片路由的 404 也是 API 语义的一部分。
 */
export async function imageReadController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { buffer, mimeType } = await loadImage(String(req.params.key ?? ''))

    // Content-Type 取自重编码后落库的值，绝不采信客户端上送的类型。
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Length', String(buffer.byteLength))
    res.setHeader('Cache-Control', IMAGE_CACHE_CONTROL)
    // 显式声明，不依赖全局中间件：本路由是唯一直接输出用户上传字节的出口。
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', 'inline')
    res.status(200).end(buffer)
  } catch (error) {
    next(error)
  }
}
