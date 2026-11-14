// SPDX-License-Identifier: AGPL-3.0-or-later
import express, { type Express } from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { appEnv } from './config/env.js'
import { accessLog } from './middleware/access-log.js'
import { bodyLimit } from './middleware/body-limit.js'
import { errorHandler } from './middleware/error-handler.js'
import { apiNotFound } from './middleware/not-found.js'
import { requestId } from './middleware/request-id.js'
import { securityHeaders } from './middleware/security-headers.js'
import { apiRouter } from './routes.js'

/** Express 装配：中间件链顺序固定，静态托管与 SPA 回退位于 API 之后。 */
export function createApp(): Express {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', false)

  // 1 请求标识 → 2 安全头 → 3 访问日志 → 4 请求体限制
  app.use(requestId)
  app.use(securityHeaders)
  app.use(accessLog)
  app.use(bodyLimit)

  // 8 API 路由分发；未匹配的 /api 路径返回统一错误包络
  app.use('/api', apiRouter)
  app.use('/api', apiNotFound)

  // 5 静态资源：托管前端构建产物（生产期由 Express 单进程提供）
  const indexFile = join(appEnv.publicDir, 'index.html')
  if (existsSync(indexFile)) {
    app.use(express.static(appEnv.publicDir, { index: false, maxAge: '1h' }))
    // SPA 回退：非 API 的文档请求一律返回入口文件，由前端路由接管
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next()
        return
      }
      res.sendFile(indexFile)
    })
  } else {
    app.get('/', (_req, res) => {
      res
        .status(200)
        .type('text/plain')
        .send('STARPAL API 已启动。前端构建产物尚未生成，请执行前端构建后重试。')
    })
  }

  // 12 未匹配 → 13 集中错误归一化
  app.use((req, res) => apiNotFound(req, res))
  app.use(errorHandler)
  return app
}
