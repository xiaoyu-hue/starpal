// SPDX-License-Identifier: AGPL-3.0-or-later
import multer from 'multer'
import type { NextFunction, Request, Response } from 'express'
import { appEnv } from '../config/env.js'
import { DomainError } from '../shared/errors.js'

/**
 * 单图上传中间件（ARCHITECTURE.md §8.3「传输」与「中间件」两层）。
 *
 * 只用内存缓冲，**绝不落盘**：Serverless 没有可写持久目录，临时文件反而会留下
 * 清理不了的残留。内存里处理完即被回收，中途失败也不产生孤儿文件。
 *
 * 这里只做传输层限制（字节数、文件数、字段数），**不判定图片类型**——
 * 类型由管线的魔术字节校验决定，`fileFilter` 里看 `mimetype` 是不可信输入。
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: appEnv.maxUploadBytes,
    files: 1,
    // 表单字段一律不接收：图片元数据全部由服务端推导，减少一类注入面。
    fields: 0,
    parts: 2,
  },
})

const singleImage = upload.single('image')

/** 把 multer 的传输错误翻译成领域错误，保持统一响应包络。 */
export function singleImageUpload(req: Request, res: Response, next: NextFunction): void {
  singleImage(req, res, (error: unknown) => {
    if (error === undefined || error === null) {
      next()
      return
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const mb = (appEnv.maxUploadBytes / 1024 / 1024).toFixed(0)
        next(new DomainError('PAYLOAD_TOO_LARGE', `单张图片不得超过 ${mb} MB`))
        return
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        next(new DomainError('VALIDATION_FAILED', '图片字段名必须为 image，且一次只能上传一张'))
        return
      }
      next(new DomainError('VALIDATION_FAILED', '上传请求格式不正确'))
      return
    }

    next(error)
  })
}
