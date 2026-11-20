// SPDX-License-Identifier: AGPL-3.0-or-later
import { config as loadDotenv } from 'dotenv'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 定位仓库根：以本模块位置为基准向上三级（config → src|dist → server → 仓库根）。
 * 源码期与编译期目录层级一致，且不依赖工作目录或 .env 是否存在。
 * 生产环境由平台注入环境变量（无 .env 文件），npm workspace 又会把 cwd 切到包目录，
 * 仅凭 cwd 或 .env 定位会得到 server/server/public 这类错误路径，导致静态资源 404。
 */
function findRepoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
}

const REPO_ROOT = findRepoRoot()
loadDotenv({ path: join(REPO_ROOT, '.env'), quiet: true })

type NodeEnv = 'development' | 'test' | 'production'

const REQUIRED = ['DATABASE_URL', 'SESSION_SECRET'] as const

const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: '3000',
  SESSION_TTL_HOURS: '168',
  RATE_LIMIT_WINDOW_SECONDS: '3600',
  RATE_LIMIT_MAX: '20',
  // 私信写限流（D-1）：短窗口 + 较宽松阈值，允许正常密集聊天，只拦短时间刷屏。
  MESSAGE_SEND_WINDOW_SECONDS: '60',
  MESSAGE_SEND_MAX: '30',
  LOGIN_FAIL_MAX: '5',
  SECURITY_EVENT_RETENTION_DAYS: '30',
  // 图片与请求体上限：与 ARCHITECTURE.md ADR-014 / DEPLOYMENT.md 一致。
  // 单图 3 MB，请求体 4 MB（Vercel 平台硬上限 4.5 MB，留出包头余量）。
  MAX_UPLOAD_BYTES: '3145728',
  MAX_BODY_BYTES: '4194304',
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
  positiveInt('MESSAGE_SEND_WINDOW_SECONDS')
  positiveInt('MESSAGE_SEND_MAX')
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
    rateLimitWindowSeconds: positiveInt('RATE_LIMIT_WINDOW_SECONDS'),
    rateLimitMax: positiveInt('RATE_LIMIT_MAX'),
    messageSendWindowSeconds: positiveInt('MESSAGE_SEND_WINDOW_SECONDS'),
    messageSendMax: positiveInt('MESSAGE_SEND_MAX'),
    loginFailMax: positiveInt('LOGIN_FAIL_MAX'),
    securityEventRetentionDays: positiveInt('SECURITY_EVENT_RETENTION_DAYS'),
    maxUploadBytes: positiveInt('MAX_UPLOAD_BYTES'),
    maxBodyBytes: positiveInt('MAX_BODY_BYTES'),
    publicDir: resolve(REPO_ROOT, read('PUBLIC_DIR')),
  }
}

/** 每次读取重新求值，便于测试注入环境变量；启动校验在 index.ts 显式调用。 */
export const appEnv = env()

export { REPO_ROOT }
