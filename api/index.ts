import { createApiApp } from '../server/src/api-app.js'

/**
 * Vercel 无服务器函数入口（Node 运行时）。
 * 默认导出 Express 实例，Vercel 的 @vercel/node 会自动以 app(req, res) 方式调度。
 * 静态资源由 Vercel 从 outputDirectory（server/public）的 CDN 提供，不在函数内处理。
 */
const app = createApiApp()
export default app
