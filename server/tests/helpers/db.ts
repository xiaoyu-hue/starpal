// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

/**
 * 测试用数据库夹具：内存态 WASM PostgreSQL，不连接任何真实库。
 * 每次创建都是全新实例，测试之间互不影响；进程结束即丢弃，无残留。
 */
const MIGRATIONS_DIR = fileURLToPath(new URL('../../src/db/migrations/', import.meta.url))

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort()
}

export function migrationSql(filename: string): string {
  return readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
}

/** 按版本序执行全部迁移，返回已就绪的数据库句柄。 */
export async function createMigratedDb(): Promise<PGlite> {
  const db = new PGlite()
  for (const filename of migrationFiles()) {
    try {
      await db.exec(migrationSql(filename))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`迁移 ${filename} 执行失败：${reason}`)
    }
  }
  return db
}

/** 最小可用用户：后续测试需要作者 / 触发者外键。 */
export async function seedUser(db: PGlite, id: number, username: string): Promise<void> {
  await db.exec(`
    INSERT INTO users (id, username, password_hash, display_name)
    VALUES (${id}, '${username}', 'x', '${username}')
  `)
}

/** 最小可用帖子：依赖已存在的作者与话题。 */
export async function seedPost(db: PGlite, id: number, authorId: number): Promise<void> {
  await db.exec(`
    INSERT INTO posts (id, author_id, topic_id, title, body, excerpt)
    VALUES (${id}, ${authorId}, 1, '测试帖 ${id}', '正文', '正文')
  `)
}

/** 断言某条语句因约束被拒绝；返回错误信息便于在失败时定位是哪条约束。 */
export async function expectRejected(db: PGlite, sql: string): Promise<string> {
  try {
    await db.exec(sql)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error(`预期被拒绝但执行成功：${sql.slice(0, 80)}`)
}
