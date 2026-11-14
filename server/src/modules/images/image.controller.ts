import type { NextFunction, Request, Response } from 'express'
import { loadImage } from './image.service.js'

/** 一年：键随机且内容不可变，可安全长期缓存（ARCHITECTURE.md §8.2）。 */
const IMMUTABLE_MAX_AGE = 'public, max-age=31536000, immutable'

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
    res.setHeader('Cache-Control', IMMUTABLE_MAX_AGE)
    // 显式声明，不依赖全局中间件：本路由是唯一直接输出用户上传字节的出口。
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', 'inline')
    res.status(200).end(buffer)
  } catch (error) {
    next(error)
  }
}
