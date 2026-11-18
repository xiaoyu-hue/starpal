#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 静态检查门（DoD-01 / M1-S3-T2 / IR-06）。
 * 零依赖，贴合本仓库 scripts/*.mjs 既有质量门约定。
 *
 * 硬规则（任一命中即失败，退出码 1）：
 *   R1 模块导入边界：server/src/modules/<A> 不得 import modules/<B>(B≠A) 内部文件，
 *                    仅可经 modules/<B>/index.js 公共出口；web/src/features 同此约束。
 *   R2 设计令牌字面量：web/src 下的代码文件（.ts/.tsx/.js/.jsx）不得硬编码颜色字面量
 *                    （#hex / rgb() / hsl()）；walk() 只收代码文件，不扫 .css，
 *                    故 CSS 内的字面量（如 globals.css 的蒙层色）不受本规则约束，
 *                    需人工确保取自 styles/tokens.css 令牌。
 *                    允许清单：tailwind.config.ts、styles/tokens.css、lib/theme.ts。
 *   R3 导入扩展名一致性：server 相对导入必须以 .js 结尾；web 相对导入不得带扩展名。
 *   R4 版本号一致性：根 / web / server 三个 package.json 与 server 的 APP_VERSION 必须相同。
 *
 * 软规则（仅告警，不失败）：
 *   W1 导入排序：外部包 import 须先于相对 import，且组内按字典序。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SCAN = ['server/src', 'web/src']
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.output', 'coverage'])
const TOKEN_ALLOW = [/tailwind\.config\.(ts|js)$/, /styles[\\/]tokens\.css$/, /lib[\\/]theme\.ts$/]

const errors = []
const warnings = []

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js|jsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p)
  }
  return out
}

/** 收集文件内所有 import / export-from 语句：{ line, spec, ext } */
function parseImports(text) {
  const res = []
  const re = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(text))) {
    const idx = m.index
    const line = text.slice(0, idx).split('\n').length
    res.push({ line, spec: m[1] })
  }
  // 副作用导入：import 'x'
  const side = /import\s+['"]([^'"]+)['"]/g
  while ((m = side.exec(text))) {
    const idx = m.index
    const line = text.slice(0, idx).split('\n').length
    res.push({ line, spec: m[1] })
  }
  for (const i of res) i.ext = i.spec.startsWith('.')
  return res
}

function resolveTarget(relFile, spec) {
  const abs = path.resolve(path.dirname(path.join(ROOT, relFile)), spec)
  return path.relative(ROOT, abs).split(path.sep).join('/')
}

function lineOf(text, n) {
  return text.split('\n')[n - 1] ?? ''
}

for (const base of SCAN) {
  for (const file of walk(path.join(ROOT, base))) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    const text = fs.readFileSync(file, 'utf8')
    const imports = parseImports(text)

    // ---- R1 模块导入边界 ----
    const sMod = rel.match(/^server\/src\/modules\/([a-z0-9_]+)\//)
    if (sMod) {
      const cur = sMod[1]
      for (const im of imports) {
        if (!im.ext) continue
        const tgt = resolveTarget(rel, im.spec)
        const tMod = tgt.match(/^server\/src\/modules\/([a-z0-9_]+)\//)
        if (tMod && tMod[1] !== cur) {
          const viaBarrel = /index\.(js|ts)$/.test(tgt)
          if (!viaBarrel) {
            errors.push(
              `${rel}:${im.line} [R1] 模块边界越界：modules/${cur} 不得 import modules/${tMod[1]} 内部文件\n      应改为经 modules/${tMod[1]}/index.js 公共出口（当前：${im.spec}）`,
            )
          }
        }
      }
    }
    const wFeat = rel.match(/^web\/src\/features\/([a-z0-9_]+)\//)
    if (wFeat) {
      const cur = wFeat[1]
      for (const im of imports) {
        if (!im.ext) continue
        const tgt = resolveTarget(rel, im.spec)
        const tFeat = tgt.match(/^web\/src\/features\/([a-z0-9_]+)\//)
        if (tFeat && tFeat[1] !== cur) {
          const viaBarrel = /index\.(ts|tsx)$/.test(tgt)
          if (!viaBarrel) {
            errors.push(
              `${rel}:${im.line} [R1] 特性边界越界：features/${cur} 不得 import features/${tFeat[1]} 内部文件\n      应改为经 features/${tFeat[1]}/index 公共出口（当前：${im.spec}）`,
            )
          }
        }
      }
    }

    // ---- R2 设计令牌字面量（仅 web）----
    if (rel.startsWith('web/src') && !TOKEN_ALLOW.some((re) => re.test(rel))) {
      const lines = text.split('\n')
      // 每行重新构造匹配：不能复用带 /g 的正则跨行 exec（lastIndex 会串到下一行，漏检）。
      const colorRe = () => /#([0-9a-fA-F]{3,8})\b|rgba?\(|hsla?\(/g
      lines.forEach((ln, i) => {
        const trimmed = ln.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        // var(--token) 及其 fallback 是令牌用法，不算硬编码；但不能因一行含 var(...) 就整行跳过，
        // 否则 `color: var(--x); border:#fff` 这种同行混写会漏检。把 var(...) 调用段剔除后再查。
        const withoutVars = ln.replace(/var\([^)]*\)/g, '')
        for (const mm of withoutVars.matchAll(colorRe())) {
          errors.push(`${rel}:${i + 1} [R2] 硬编码颜色字面量「${mm[0]}」，应复用令牌（CSS 变量）单一来源`)
        }
      })
    }

    // ---- R3 导入扩展名一致性 ----
    for (const im of imports) {
      if (!im.ext) continue
      if (rel.startsWith('server/src')) {
        if (!/\.(js|json)$/.test(im.spec)) {
          errors.push(`${rel}:${im.line} [R3] server 相对导入须以 .js 结尾（当前：${im.spec}）`)
        }
      } else if (rel.startsWith('web/src')) {
        if (/\.(js|jsx|ts|tsx)$/.test(im.spec)) {
          errors.push(`${rel}:${im.line} [R3] web 相对导入不得带扩展名（当前：${im.spec}）`)
        }
      }
    }

    // ---- W1 导入排序（软告警）----
    if (imports.length >= 2) {
      const firstRel = imports.find((x) => x.ext)
      if (firstRel) {
        let bad = false
        for (const im of imports) {
          if (!im.ext && im.line > firstRel.line) bad = true // 相对之后又出现外部包
        }
        const ext = imports.filter((x) => !x.ext).map((x) => x.spec)
        const rel2 = imports.filter((x) => x.ext).map((x) => x.spec)
        const sorted = (a) => a.every((v, i) => i === 0 || a[i - 1] <= v)
        if (!sorted(ext) || !sorted(rel2)) bad = true
        if (bad) warnings.push(`${rel} [W1] 导入排序建议：外部包先于相对路径、组内按字典序（${imports.length} 条 import）`)
      }
    }
  }
}

/** R4 版本号一致性：四处版本号必须同源，避免界面、健康检查与包声明各说各话。 */
function checkVersions() {
  const pkgFiles = ['package.json', 'web/package.json', 'server/package.json']
  const pkgVersions = pkgFiles.map((f) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')).version ?? null
    } catch {
      return null
    }
  })
  let backend = null
  try {
    const src = fs.readFileSync(path.join(ROOT, 'server/src/config/constants.ts'), 'utf8')
    backend = src.match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1] ?? null
  } catch {
    backend = null
  }
  const all = [...pkgVersions, backend]
  if (all.some((v) => !v) || new Set(all).size !== 1) {
    const detail = [...pkgFiles.map((f, i) => `${f}=${pkgVersions[i] ?? '缺失'}`), `APP_VERSION=${backend ?? '缺失'}`]
    errors.push(`[R4] 版本号不一致：${detail.join('，')}`)
  }
}

checkVersions()

let ok = true
if (errors.length) {
  ok = false
  console.error(`\n✗ lint 失败：${errors.length} 处硬规则违规\n`)
  for (const e of errors) console.error('  - ' + e)
}
if (warnings.length) {
  console.warn(
    `\n! lint 软告警：${warnings.length} 个文件可优化导入排序（外部包先于相对路径、组内字典序），不阻断构建。`,
  )
}
if (ok && !warnings.length) console.log('✓ lint 通过：模块边界、令牌字面量、导入扩展名一致性均无违规')
else if (ok) console.log(`✓ lint 通过（硬规则 0 违规；软告警 ${warnings.length} 处，不阻断）`)

process.exit(ok ? 0 : 1)
