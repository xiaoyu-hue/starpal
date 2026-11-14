// SPDX-License-Identifier: AGPL-3.0-or-later
import { cpSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 把 SQL 迁移文件复制进编译产物目录。
 * tsc 只编译 .ts，编译后的 dist/db/migrate.js 会在自身目录找 migrations/，
 * 若不复制则生产环境执行迁移时读不到任何 SQL（本地用 tsx 跑源码不受影响）。
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = join(repoRoot, 'server/src/db/migrations')
const targetDir = join(repoRoot, 'server/dist/db/migrations')

mkdirSync(targetDir, { recursive: true })
const files = readdirSync(sourceDir).filter((name) => /^\d{3}_.+\.sql$/.test(name))
for (const file of files) {
  cpSync(join(sourceDir, file), join(targetDir, file))
}

if (files.length === 0) {
  throw new Error('[copy-migrations] 未找到任何迁移文件，构建终止')
}
console.log(`[copy-migrations] 已复制 ${files.length} 个迁移文件到 dist/db/migrations`)
