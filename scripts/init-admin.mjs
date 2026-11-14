#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 一次性创建初始管理员（M2-S3-T3 / FR-AUTH-17 / AC-18）。
 *
 * 安全约定：
 * - 凭据只从环境变量读取，绝不写入仓库，绝不打印到标准输出或日志；
 * - 默认幂等：同名账号已存在时不改密码、不改角色、直接退出；
 * - 只有显式传入 --reset 才重置密码，并同时撤销该账号全部会话；
 * - 复用 server/dist 的 hashPassword 与准入常量，避免哈希参数漂移。
 *
 * 推荐用法（密码放环境文件，不写命令行）：
 *   node --env-file=.env.local scripts/init-admin.mjs
 * 非交互场景也可直接注入环境变量后执行 npm run init:admin，
 * 但那样会留在 shell 历史与进程列表，仅建议在受控环境使用。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import pg from 'pg'

const REPO = fileURLToPath(new URL('../', import.meta.url))
// 不覆盖已由 --env-file 或平台注入的环境变量。
loadDotenv({ path: join(REPO, '.env'), quiet: true })

const RESET = process.argv.includes('--reset')

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
  for (const path of [passwordPath, constantsPath]) {
    if (!existsSync(path)) {
      throw new Error('未找到 server/dist 编译产物，请先执行 npm run build')
    }
  }
  const [{ hashPassword }, constants] = await Promise.all([
    import(pathToFileURL(passwordPath).href),
    import(pathToFileURL(constantsPath).href),
  ])
  if (
    typeof hashPassword !== 'function' ||
    typeof constants.ROLE_ADMIN !== 'string' ||
    constants.USERNAME_PATTERN === undefined
  ) {
    throw new Error('server/dist 已过期，请重新执行 npm run build')
  }
  return { hashPassword, constants }
}

function validate(username, password, displayName, c) {
  if (
    username.length < c.USERNAME_MIN ||
    username.length > c.USERNAME_MAX ||
    !c.USERNAME_PATTERN.test(username)
  ) {
    throw new Error(
      `ADMIN_USERNAME 不符合准入规则（${c.USERNAME_MIN}—${c.USERNAME_MAX} 位，仅字母 / 数字 / 下划线）`,
    )
  }
  if (password.length < c.PASSWORD_MIN || password.length > c.PASSWORD_MAX) {
    throw new Error(`ADMIN_PASSWORD 长度须在 ${c.PASSWORD_MIN}—${c.PASSWORD_MAX} 之间`)
  }
  if (displayName.length > c.DISPLAY_NAME_MAX) {
    throw new Error(`ADMIN_DISPLAY_NAME 最长 ${c.DISPLAY_NAME_MAX} 个字符`)
  }
}

async function main() {
  const databaseUrl = required('DATABASE_URL')
  const username = required('ADMIN_USERNAME')
  const password = required('ADMIN_PASSWORD')
  const displayName = (process.env.ADMIN_DISPLAY_NAME ?? '').trim() || username

  const { hashPassword, constants } = await loadCompiled()
  validate(username, password, displayName, constants)

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
    application_name: 'starpal-init-admin',
  })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const tables = await client.query(
      "SELECT to_regclass('public.users') AS users, to_regclass('public.user_profiles') AS profiles",
    )
    if (!tables.rows[0]?.users || !tables.rows[0]?.profiles) {
      throw new Error('数据表不存在，请先执行 npm run migrate')
    }

    const existing = await client.query(
      'SELECT id, role_id FROM users WHERE username = $1',
      [username],
    )
    const row = existing.rows[0]

    if (row && !RESET) {
      await client.query('ROLLBACK')
      console.log(`[init:admin] 账号 ${username} 已存在，未做任何修改（幂等）。`)
      console.log('[init:admin] 如需重置密码，请显式追加 --reset 参数。')
      return
    }

    // 内存硬哈希约需百毫秒级，放在事务内可接受；哈希串不进入任何日志。
    const passwordHash = await hashPassword(password)

    if (row) {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
        [passwordHash, row.id],
      )
      await client.query(
        'INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [row.id],
      )
      // 重置密码后旧会话必须全部失效，避免旧 Cookie 继续持有管理员权限。
      await client.query('DELETE FROM sessions WHERE user_id = $1', [row.id])
      await client.query('COMMIT')
      console.log(`[init:admin] 已重置账号 ${username} 的密码，并撤销其全部会话；角色未改动。`)
      return
    }

    const role = await client.query(
      'SELECT id FROM roles WHERE name = $1',
      [constants.ROLE_ADMIN],
    )
    if (role.rows.length === 0) {
      throw new Error(`roles 表缺少 ${constants.ROLE_ADMIN} 角色，请检查 001 迁移`)
    }

    const inserted = await client.query(
      `INSERT INTO users (username, display_name, password_hash, role_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [username, displayName, passwordHash, role.rows[0].id],
    )
    await client.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [
      inserted.rows[0].id,
    ])
    await client.query('COMMIT')
    console.log(
      `[init:admin] 已创建管理员 ${username}（角色 ${constants.ROLE_ADMIN}）。凭据未打印、未入仓。`,
    )
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  // 只打印错误消息文本，不打印堆栈，避免环境变量或凭据意外泄露。
  console.error(`[init:admin] 失败：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
