import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/**
 * 定位仓库根：从工作目录逐级向上查找 .env。
 * npm workspace 会把 cwd 切换到包目录，直接以 cwd 拼相对路径会解析错位。
 * 找不到 .env 时回退到 cwd，兼容仅通过真实环境变量注入的生产部署。
 */
function findRepoRoot(): string {
  let dir = process.cwd()
  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(join(dir, '.env'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

const REPO_ROOT = findRepoRoot()
loadDotenv({ path: join(REPO_ROOT, '.env'), quiet: true })

type NodeEnv = 'development' | 'test' | 'production'

const REQUIRED = ['DATABASE_URL', 'SESSION_SECRET', 'INVITE_CODE'] as const

const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: '3000',
  SESSION_TTL_HOURS: '168',
  RATE_LIMIT_WINDOW_SECONDS: '3600',
  RATE_LIMIT_MAX: '20',
  LOGIN_FAIL_MAX: '5',
  SECURITY_EVENT_RETENTION_DAYS: '30',
  UPLOAD_DIR: './server/uploads',
  MAX_UPLOAD_BYTES: '5242880',
  MAX_BODY_BYTES: '6291456',
  PUBLIC_DIR: './server/public',
} as const

function read(name: string): string {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') {
    if (name in DEFAULTS) return DEFAULTS[name as keyof typeof DEFAULTS]
    return ''
  }
  return value.trim()
}

function positiveInt(name: string): number {
  const raw = read(name)
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`[配置校验] ${name} 必须为正整数，当前值非法`)
  }
  return value
}

/** 启动校验：缺失必需变量或数值非法时立即失败，不进入监听状态。 */
export function validateEnv(): void {
  const missing = REQUIRED.filter((name) => read(name) === '')
  if (missing.length > 0) {
    throw new Error(`[配置校验] 缺少必需环境变量：${missing.join(', ')}`)
  }
  const nodeEnv = read('NODE_ENV')
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error(`[配置校验] NODE_ENV 取值非法：${nodeEnv}`)
  }
  positiveInt('PORT')
  positiveInt('SESSION_TTL_HOURS')
  positiveInt('RATE_LIMIT_WINDOW_SECONDS')
  positiveInt('RATE_LIMIT_MAX')
  positiveInt('LOGIN_FAIL_MAX')
  positiveInt('SECURITY_EVENT_RETENTION_DAYS')
  const upload = positiveInt('MAX_UPLOAD_BYTES')
  const body = positiveInt('MAX_BODY_BYTES')
  if (body < upload) {
    throw new Error('[配置校验] MAX_BODY_BYTES 必须不小于 MAX_UPLOAD_BYTES')
  }
  const url = read('DATABASE_URL')
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error('[配置校验] DATABASE_URL 必须是 PostgreSQL 连接串')
  }
}

function env() {
  return {
    nodeEnv: read('NODE_ENV') as NodeEnv,
    isProduction: read('NODE_ENV') === 'production',
    port: positiveInt('PORT'),
    databaseUrl: read('DATABASE_URL'),
    sessionSecret: read('SESSION_SECRET'),
    sessionTtlHours: positiveInt('SESSION_TTL_HOURS'),
    inviteCode: read('INVITE_CODE'),
    rateLimitWindowSeconds: positiveInt('RATE_LIMIT_WINDOW_SECONDS'),
    rateLimitMax: positiveInt('RATE_LIMIT_MAX'),
    loginFailMax: positiveInt('LOGIN_FAIL_MAX'),
    securityEventRetentionDays: positiveInt('SECURITY_EVENT_RETENTION_DAYS'),
    uploadDir: resolve(REPO_ROOT, read('UPLOAD_DIR')),
    maxUploadBytes: positiveInt('MAX_UPLOAD_BYTES'),
    maxBodyBytes: positiveInt('MAX_BODY_BYTES'),
    publicDir: resolve(REPO_ROOT, read('PUBLIC_DIR')),
  }
}

/** 每次读取重新求值，便于测试注入环境变量；启动校验在 index.ts 显式调用。 */
export const appEnv = env()

export { REPO_ROOT }
