#!/usr/bin/env node
// 文件预算检查：防止单文件膨胀为难以维护的巨型文件。
// 规则：.ts / .tsx ≤ 300 行，.css ≤ 400 行；超出即失败。
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('../', import.meta.url))
const ROOTS = ['web/src', 'server/src'].map((dir) => join(REPO, dir))
const LIMITS = { '.ts': 300, '.tsx': 300, '.css': 400 }

let scanned = 0
const exceeded = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    const limit = LIMITS[extname(name)]
    if (!limit) continue
    const lines = readFileSync(path, 'utf8').split('\n').length
    scanned += 1
    if (lines > limit) exceeded.push(`${relative(REPO, path)}  ${lines} 行 > ${limit}`)
  }
}

for (const root of ROOTS) {
  if (existsSync(root)) walk(root)
}
console.log(`文件体积检查：扫描 ${scanned} 个源文件（web/src、server/src）`)
if (exceeded.length > 0) {
  console.error('超出预算：\n' + exceeded.map((item) => `  - ${item}`).join('\n'))
  process.exit(1)
}
console.log('全部在预算内（.ts/.tsx ≤ 300 行，.css ≤ 400 行）')
