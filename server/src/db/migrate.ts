import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, withTransaction } from './pool.js'
import { validateEnv } from '../config/env.js'

/**
 * 解析迁移目录。需同时兼容两种运行环境：
 * 1) 本地/未打包：迁移文件与编译后的 migrate.js 同目录（dist/db/migrations）。
 * 2) Vercel 无服务器函数：esbuild 把代码打包成单一产物，import.meta.url 指向
 *    打包文件而非原模块；而 functions.includeFiles 把迁移按「项目相对路径」
 *    server/dist/db/migrations 放在 lambda 根目录，且 lambda 的 cwd 即该根目录。
 * 因此按候选路径逐个探测，返回第一个真实存在的目录。
 */
function resolveMigrationsDir(): string {
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), 'migrations'),
    join(process.cwd(), 'server/dist/db/migrations'),
    join(process.cwd(), 'dist/db/migrations'),
  ]
  for (const dir of candidates) {
    try {
      if (existsSync(dir)) return dir
    } catch {
      // 忽略探测失败，继续下一个候选
    }
  }
  return candidates[0]!
}

const MIGRATIONS_DIR = resolveMigrationsDir()

type MigrationFile = { version: string; filename: string; sql: string }

function loadMigrations(): MigrationFile[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort()
  return files.map((filename) => ({
    version: filename.slice(0, 3),
    filename,
    sql: readFileSync(join(MIGRATIONS_DIR, filename), 'utf8'),
  }))
}

async function ensureLedger(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     VARCHAR(8) PRIMARY KEY,
      filename    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

async function appliedVersions(): Promise<Set<string>> {
  const result = await pool.query<{ version: string }>('SELECT version FROM schema_migrations')
  return new Set(result.rows.map((row) => row.version))
}

/** 幂等执行待应用迁移；作为库调用时（如 Vercel 函数冷启动）不关闭连接池。 */
export async function runMigrations(): Promise<void> {
  validateEnv()
  await ensureLedger()
  const done = await appliedVersions()
  const pending = loadMigrations().filter((migration) => !done.has(migration.version))

  if (pending.length === 0) {
    console.log('[migrate] 无待应用迁移，数据库结构已是最新。')
    return
  }

  for (const migration of pending) {
    // 每个迁移在独立事务内执行；结构与账本同时提交或同时回滚。
    await withTransaction(async (client) => {
      await client.query(migration.sql)
      await client.query(
        'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
        [migration.version, migration.filename],
      )
    })
    console.log(`[migrate] 已应用 ${migration.filename}`)
  }
  console.log(`[migrate] 完成，共应用 ${pending.length} 个迁移。`)
}

// 仅当作为独立脚本直接执行时才自动收尾并退出（Vercel 函数以库方式调用时不关闭连接池）。
const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (invokedDirectly) {
  runMigrations()
    .then(() => pool.end())
    .catch((error: unknown) => {
      console.error('[migrate] 失败:', error instanceof Error ? error.message : String(error))
      void pool.end().finally(() => process.exit(1))
    })
}
