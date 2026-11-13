import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Vercel 无服务器函数入口（ESM）。
 *
 * 路由说明：`vercel.json` 用 `/api/:path* → /api` 的 rewrite 把 `/api/` 下
 * 任意层级的请求统一导入本函数，Vercel 保留原始请求路径，Express 按完整
 * 路径匹配。入口命名为 index.ts（对应函数路径 /api），不依赖 [...slug]
 * 的 catch-all 匹配行为。
 *
 * 关键约束：顶层不得有任何运行时 import / 依赖 import.meta 的代码。
 * 所有工作都放进 handler 内的动态 import，并整体包在 try/catch 中——
 * 否则模块加载阶段抛错会被平台渲染成黑盒 FUNCTION_INVOCATION_FAILED，
 * 既无法兜底也无法排查。Express 及其 CJS 依赖由 Vercel 以原生模块方式
 * 提供，无需任何打包垫片。
 */
type Loaded = {
  app: (req: IncomingMessage, res: ServerResponse) => void
}

let cached: Promise<Loaded> | null = null

function load(): Promise<Loaded> {
  if (!cached) {
    cached = (async () => {
      const { createApiApp } = await import('../server/dist/api-app.js')
      const { runMigrations } = await import('../server/dist/db/migrate.js')
      const app = createApiApp()
      // 冷启动惰性迁移：首个请求触发一次，幂等。
      await runMigrations()
      return { app }
    })().catch((err: unknown) => {
      // 失败时清空缓存，允许下次请求重试。
      cached = null
      throw err
    })
  }
  return cached
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const { app } = await load()
    app(req, res)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.stack || err.message : String(err)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json; charset=utf-8')
    }
    if (!res.writableEnded) {
      res.end(JSON.stringify({ error: 'internal_error', message }))
    }
  }
}
