#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 导出文件可读性校验（export:check）。
 *
 * 目标：确保「用户数据导出」产物可被外部工具读取，且不包含其他用户的数据或
 *       敏感字段（password_hash / session 等）。该能力在 M5 正式落地，本脚本先行
 *       定义最小契约并可在无参数时以自测样例验证自身逻辑。
 *
 * 用法：
 *   node scripts/export-check.mjs                 # 运行内置自测样例
 *   node scripts/export-check.mjs <path.json>     # 校验指定导出文件
 *   node scripts/export-check.mjs --file=<path>   # 同上
 */
import { existsSync, readFileSync } from 'node:fs'

const FORBIDDEN_KEYS = ['password_hash', 'passwordHash', 'session', 'sessionId', 'role']
const REQUIRED_KEYS = ['user']

/**
 * 校验一份导出数据的结构合法性与隐私边界。返回 { ok, errors[] }。
 * @param {unknown} data 已解析的导出对象
 */
export function checkExport(data) {
  const errors = []
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, errors: ['导出根节点必须是 JSON 对象'] }
  }
  for (const k of REQUIRED_KEYS) {
    if (!(k in data)) errors.push(`缺少必需顶层键：${k}`)
  }
  const user = data.user
  if (user !== undefined && (typeof user !== 'object' || user === null)) {
    errors.push('user 必须是对象')
  }
  if (user && typeof user === 'object' && !('username' in user) && !('id' in user)) {
    errors.push('user 须声明归属（username 或 id）')
  }
  // 隐私边界：不得携带敏感字段
  const scan = (obj, path) => {
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => scan(v, `${path}[${i}]`))
    } else if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        if (FORBIDDEN_KEYS.includes(k)) errors.push(`发现不应导出的字段 ${path}.${k}`)
        scan(v, `${path}.${k}`)
      }
    }
  }
  scan(data, 'root')
  return { ok: errors.length === 0, errors }
}

function pass(msg) {
  console.log(`  ✓ ${msg}`)
}
function fail(msg) {
  console.error(`  ✗ ${msg}`)
}

function runSelfTest() {
  console.log('[export:check] 运行自测样例：')
  const good = {
    user: { username: 'alice', displayName: 'Alice' },
    generatedAt: '2026-11-14T00:00:00.000Z',
    posts: [{ id: 1, title: '我的第一篇' }],
  }
  const r1 = checkExport(good)
  if (r1.ok) pass('合法导出通过校验') ; else { fail('合法导出被误判失败：' + r1.errors.join('; ')); process.exitCode = 1 }

  const bad = {
    user: { username: 'alice' },
    posts: [{ id: 1, author: { username: 'bob', password_hash: 'x' } }],
  }
  const r2 = checkExport(bad)
  if (!r2.ok) pass('含他用户敏感字段的导出被正确拦截')
  else { fail('含 password_hash 的越界导出未被拦截'); process.exitCode = 1 }

  if (process.exitCode !== 1) console.log('[export:check] 自测通过。')
}

function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--'))
  const fileFlag = process.argv.find((a) => a.startsWith('--file='))
  const target = arg || (fileFlag ? fileFlag.slice('--file='.length) : null)

  if (!target) {
    runSelfTest()
    return
  }
  if (!existsSync(target)) {
    console.error(`[export:check] 文件不存在：${target}`)
    process.exitCode = 1
    return
  }
  let raw
  try {
    raw = readFileSync(target, 'utf8')
  } catch (e) {
    console.error(`[export:check] 读取失败：${e.message}`)
    process.exitCode = 1
    return
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    console.error(`[export:check] JSON 解析失败（不可被外部工具读取）：${e.message}`)
    process.exitCode = 1
    return
  }
  const { ok, errors } = checkExport(data)
  if (ok) {
    console.log(`[export:check] 通过：${target} 结构合法且不含越界敏感字段。`)
  } else {
    console.error(`[export:check] 不通过：${target}`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exitCode = 1
  }
}

main()
