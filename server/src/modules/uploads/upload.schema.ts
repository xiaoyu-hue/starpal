import { DomainError } from '../../shared/errors.js'

/**
 * 上传接口的入参解析。
 * 图片本体由 multer 解析到 `req.file`，此处只处理路径参数。
 */
export function parsePostIdParam(raw: unknown): number {
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError('VALIDATION_FAILED', '帖子编号不合法')
  }
  return value
}
