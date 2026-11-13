import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, withTransaction } from './pool.js'
import { validateEnv } from '../config/env.js'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

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

async function main(): Promise<void> {
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

main()
  .then(() => pool.end())
  .catch((error: unknown) => {
    console.error('[migrate] 失败:', error instanceof Error ? error.message : String(error))
    void pool.end().finally(() => process.exit(1))
  })
