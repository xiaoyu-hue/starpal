#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// 凭据扫描（AC-18）：工作区里不得出现可用的密钥、口令、令牌明文。
//
// 用法：
//   node scripts/scan-secrets.mjs            # 只扫工作区（默认，秒级）
//   node scripts/scan-secrets.mjs --history  # 追加扫全部提交历史（慢，提交数越多越慢）
//
// 只报「看起来是真凭据」的东西，不报占位符：`<user>`、`<由部署方生成>`、
// `xxx`、`your-token` 这类示例值命中不算问题——否则满仓示例文档会让扫描变成噪音，
// 一旦成为噪音就会被忽略，扫描本身也就失效了。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('../', import.meta.url))
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.vercel', 'coverage'])
const SKIP_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml'])

/** 每条规则 = 一个明显的凭据形态 + 说明。命中即失败。 */
const RULES = [
  { name: 'GitHub 经典令牌', pattern: /ghp_[A-Za-z0-9]{30,}/ },
  { name: 'GitHub 细粒度令牌', pattern: /github_pat_[A-Za-z0-9_]{30,}/ },
  { name: 'GitHub OAuth / App 令牌', pattern: /gh[osu]_[A-Za-z0-9]{30,}/ },
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'OpenAI / Anthropic 风格密钥', pattern: /sk-[A-Za-z0-9]{32,}/ },
  { name: '私钥文件内容', pattern: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  {
    name: '带口令的数据库连接串',
    pattern: /postgres(ql)?:\/\/[^/\s:]+:[^/\s@<>]+@/,
    // git -G 用 POSIX 正则：不支持 \s 与非捕获组，这里单独给一条等价写法。
    history: 'postgres(ql)?://[^[:space:]/:]+:[^[:space:]@<>]+@',
  },
]

/** 占位符白名单：示例文档里出现这些值时不算泄露。 */
function isPlaceholder(line) {
  return /<[^>]+>|your[-_]|example|placeholder|xxxx|\*\*\*/i.test(line)
}

const hits = []
let scanned = 0

function scanText(text, label) {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    for (const rule of RULES) {
      if (!rule.pattern.test(line)) continue
      if (isPlaceholder(line)) continue
      hits.push(`${label}:${i + 1}  ${rule.name}`)
    }
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      walk(path)
      continue
    }
    if (SKIP_FILES.has(name)) continue
    // .env 本身就存着本地密钥、且被 .gitignore 排除：扫描它的意义是「别提交」，
    // 那由「是否入库」检查负责，不在这里逐行报。
    if (/^\.env(\..*)?$/.test(name)) continue
    scanText(readFileSync(path, 'utf8'), relative(REPO, path))
    scanned += 1
  }
}

walk(REPO)

// 「.env 是否被误提交」比模式匹配更重要：密钥一旦进历史就得轮换，删文件没用。
const tracked = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' })
const trackedEnv = tracked
  .split('\n')
  .filter((file) => /(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example'))

console.log(`凭据扫描：检查 ${scanned} 个文件，规则 ${RULES.length} 条`)
if (trackedEnv.length > 0) {
  console.error('以下环境文件被纳入版本控制（必须移除并轮换其中全部密钥）：')
  for (const file of trackedEnv) console.error(`  - ${file}`)
  hits.push('git 索引中存在 .env')
}

if (process.argv.includes('--history')) {
  // 只扫「内容变更里出现该模式」的提交，比逐提交全量 diff 快得多。
  let historyHits = 0
  for (const rule of RULES) {
    const out = execFileSync(
      'git',
      ['log', '--all', '-G', rule.history ?? rule.pattern.source, '--format=%h %s'],
      { cwd: REPO, encoding: 'utf8' },
    ).trim()
    if (out === '') continue
    historyHits += 1
    console.error(`历史命中（${rule.name}）：\n${out}`)
  }
  console.log(`历史扫描：${historyHits} 条规则命中`)
  if (historyHits > 0) process.exit(1)
}

if (hits.length > 0) {
  console.error('可疑凭据：\n' + hits.map((item) => `  - ${item}`).join('\n'))
  process.exit(1)
}
console.log('未发现明文凭据；.env 未被纳入版本控制')
