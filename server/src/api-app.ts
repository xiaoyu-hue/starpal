// SPDX-License-Identifier: AGPL-3.0-or-later
import express, { type Express } from 'express'
import { requestId } from './middleware/request-id.js'
import { securityHeaders } from './middleware/security-headers.js'
import { accessLog } from './middleware/access-log.js'
import { bodyLimit } from './middleware/body-limit.js'
import { apiRouter } from './routes.js'
import { apiNotFound } from './middleware/not-found.js'
import { errorHandler } from './middleware/error-handler.js'

/**
 * 仅 API 的 Express 装配：用于 Vercel 无服务器函数。
 * 与 createApp() 的区别在于不挂载静态资源与 SPA 回退——
 * 静态托管由 Vercel 的 CDN（outputDirectory）负责，函数只处理 /api。
 */
export function createApiApp(): Express {
  const app = express()
  app.disable('x-powered-by')

  app.use(requestId)
  app.use(securityHeaders)
  app.use(accessLog)
  app.use(bodyLimit)

  app.use('/api', apiRouter)
  app.use('/api', apiNotFound)

  // 非 API 路径不应抵达函数层：交由 Vercel 静态层 SPA 回退，这里统一返回 404 包络
  app.use((req, res) => apiNotFound(req, res))
  app.use(errorHandler)
  return app
}
