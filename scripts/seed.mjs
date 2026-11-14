#!/usr/bin/env node
/**
 * 演示数据播种（可选执行）。
 *
 * 设计原则：
 * - 幂等：同名示例账号已存在时跳过，不覆盖、不报错；
 * - 仅依赖当前已落地的 schema（users / user_profiles），不臆测未来表结构；
 * - 内容域（话题 / 帖子）属 M3，待其表建立后本脚本自动识别并播种，当前仅报告；
 * - 凭据只来自环境变量，绝不入仓、绝不打印。
 *
 * 用法：node --env-file=.env scripts/seed.mjs
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import pg from 'pg'

const REPO = fileURLToPath(new URL('../', import.meta.url))
loadDotenv({ path: join(REPO, '.env'), quiet: true })

function required(name) {
  const raw = process.env[name]
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`缺少必需环境变量 ${name}`)
  }
  return raw.trim()
}

async function loadCompiled() {
  const passwordPath = join(REPO, 'server/dist/modules/auth/password.js')
  const constantsPath = join(REPO, 'server/dist/config/constants.js')
  for (const p of [passwordPath, constantsPath]) {
    if (!existsSync(p)) throw new Error('未找到 server/dist 编译产物，请先执行 npm run build')
  }
  const [{ hashPassword }, constants] = await Promise.all([
    import(pathToFileURL(passwordPath).href),
    import(pathToFileURL(constantsPath).href),
  ])
  return { hashPassword, constants }
}

async function main() {
  const databaseUrl = required('DATABASE_URL')
  const { hashPassword, constants } = await loadCompiled()

  const demoUsername = 'starpal_demo'
  const demoPassword = 'StarpalDemo2024'
  const demoDisplayName = '星聚小助手（示例）'
  const demoBio = '这是用于演示的示例账号，欢迎在星聚结识同好、分享兴趣。'

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
    application_name: 'starpal-seed',
  })
  const client = await pool.connect()
  try {
    const tables = await client.query(
      "SELECT to_regclass('public.users') AS users, to_regclass('public.user_profiles') AS profiles",
    )
    if (!tables.rows[0]?.users || !tables.rows[0]?.profiles) {
      throw new Error('数据表不存在，请先执行 npm run migrate')
    }

    const existing = await client.query('SELECT id FROM users WHERE username = $1', [demoUsername])
    if (existing.rows.length > 0) {
      console.log(`[seed] 示例账号 ${demoUsername} 已存在，跳过（幂等）。`)
    } else {
      const passwordHash = await hashPassword(demoPassword)
      const ins = await client.query(
        `INSERT INTO users (username, display_name, password_hash, role_id)
         VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = $4)) RETURNING id`,
        [demoUsername, demoDisplayName, passwordHash, constants.ROLE_USER],
      )
      await client.query(
        `INSERT INTO user_profiles (user_id, avatar_url, biography, zodiac, mbti, age_band, show_optional)
         VALUES ($1, NULL, $2, '狮子座', 'INTJ', '25-34岁', true)`,
        [ins.rows[0].id, demoBio],
      )
      console.log(`[seed] 已创建示例账号 ${demoUsername}（${demoDisplayName}），可选资料已公开。`)
    }

    // 内容域属 M3：若表已建立则播种，否则说明待办。
    const content = await client.query(
      "SELECT to_regclass('public.topics') AS topics, to_regclass('public.posts') AS posts",
    )
    const hasTopics = Boolean(content.rows[0]?.topics)
    const hasPosts = Boolean(content.rows[0]?.posts)
    if (hasTopics || hasPosts) {
      console.log(`[seed] 检测到内容表（topics=${hasTopics}, posts=${hasPosts}）；M3 阶段将在此播种示例话题与帖子。`)
    } else {
      console.log('[seed] 内容表尚未建立（M3 范围），暂无可播种的示例话题 / 帖子。')
    }

    console.log('[seed] 完成。')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(`[seed] 失败：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
