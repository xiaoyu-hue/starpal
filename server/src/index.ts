// SPDX-License-Identifier: AGPL-3.0-or-later
import { createApp } from './app.js'
import { validateEnv, appEnv } from './config/env.js'
import { assertDatabase, closePool } from './db/pool.js'

async function main(): Promise<void> {
  // 启动顺序：校验环境变量 → 连接数据库 → 监听端口
  validateEnv()
  await assertDatabase()

  const app = createApp()
  const server = app.listen(appEnv.port, '0.0.0.0', () => {
    console.log(
      JSON.stringify({
        at: 'startup',
        nodeEnv: appEnv.nodeEnv,
        port: appEnv.port,
        publicDir: appEnv.publicDir,
        message: 'STARPAL 服务已启动',
      }),
    )
  })

  const shutdown = (signal: string): void => {
    console.log(JSON.stringify({ at: 'shutdown', signal }))
    server.close(() => {
      void closePool().finally(() => process.exit(0))
    })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((error: unknown) => {
  console.error('[启动失败]', error instanceof Error ? error.message : String(error))
  void closePool().finally(() => process.exit(1))
})
