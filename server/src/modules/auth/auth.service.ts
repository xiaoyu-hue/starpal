// SPDX-License-Identifier: AGPL-3.0-or-later
import { APP_VERSION } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import {
  createUser,
  deleteSession,
  findActiveSession,
  findUserById,
  findUserByUsername,
  insertSession,
  updateLastLogin,
} from './auth.repository.js'
import { hashPassword, verifyPassword } from './password.js'
import {
  enforceLoginFailLimit,
  enforceRateLimit,
  note,
} from './rate-limit.js'
import { hashInviteCode } from '../invite/index.js'
import { newSessionId, sessionExpiresAt } from './session.js'

/** 认证业务层：注册 / 登录 / 登出 / 当前会话。凭据错误统一提示，不泄漏账户存在性。 */

const AUTH_FAILED_MESSAGE = '用户名或密码不正确'

/**
 * 用于账户不存在时执行一次等价的哈希运算，
 * 抹平「查不到用户」与「密码错误」之间的响应时间差（时序侧信道）。
 * 该常量为一次性生成的固定合法哈希，不对应任何真实账户。
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$HBvuf+y7dCMIe/zbaGGM3Q$' +
  'AhnZQF4/OpzYl9tVAovQOp6/6JNkBS5eYjAjHPIULcU'

export type PublicUser = {
  id: string
  username: string
  displayName: string
  role: string
  avatarUrl: string | null
  createdAt: string
}

function toPublicUser(row: {
  id: string
  username: string
  display_name: string
  role_name: string
  avatar_url: string | null
  created_at: Date
}): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at.toISOString(),
  }
}

/** 注册：校验、防刷、哈希、事务写入。蜜罐命中由控制器静默丢弃，不进入此处。 */
export async function register(input: {
  username: string
  password: string
  displayName: string
  inviteCode: string
  subjectHash: string
  /** 是否勾选了同意用户协议。仅用于留存同意记录，不作为准入条件。 */
  acceptedTerms: boolean
}): Promise<PublicUser> {
  await enforceRateLimit('register', input.subjectHash)
  const codeHash = hashInviteCode(input.inviteCode)
  const passwordHash = await hashPassword(input.password)
  try {
    const created = await createUser({
      username: input.username,
      displayName: input.displayName,
      passwordHash,
      subjectHash: input.subjectHash,
      acceptedTermsVersion: input.acceptedTerms ? APP_VERSION : null,
      inviteCodeHash: codeHash,
    })
    const row = await findUserById(created.id)
    if (!row) throw new DomainError('INTERNAL_ERROR', '注册结果读取失败')
    return toPublicUser(row)
  } catch (error) {
    // 邀请码在创建用户的事务内校验：无效时事务已回滚（用户未建成），此处记一次失败事件并原样抛出。
    if (error instanceof DomainError && error.code === 'INVITE_INVALID') {
      await note('register', input.subjectHash)
      throw error
    }
    // 唯一约束冲突（23505）：用户名已被占用，转换为可读的 409，不泄漏其他账户信息。
    if (isUniqueViolation(error)) {
      await note('register', input.subjectHash)
      throw new DomainError('CONFLICT', '用户名已被占用')
    }
    throw error
  }
}

/** 登录：凭据校验 → 写会话。账户不存在时亦执行哈希运算以对齐耗时。 */
export async function login(input: {
  username: string
  password: string
  subjectHash: string
}): Promise<{ user: PublicUser; sessionId: string }> {
  await enforceRateLimit('login_fail', input.subjectHash)
  await enforceLoginFailLimit(input.subjectHash)

  const row = await findUserByUsername(input.username)
  const ok = await verifyPassword(input.password, row?.password_hash ?? DUMMY_HASH)

  if (!row || !ok || row.status !== 'active') {
    await note('login_fail', input.subjectHash)
    throw new DomainError('INVALID_CREDENTIALS', AUTH_FAILED_MESSAGE)
  }

  const sessionId = newSessionId()
  await insertSession(sessionId, row.id, sessionExpiresAt())
  await updateLastLogin(row.id)
  await note('login_ok', input.subjectHash)
  return { user: toPublicUser(row), sessionId }
}

/** 登出：删除服务端会话行，Cookie 由控制器清除。 */
export async function logout(sessionId: string | null): Promise<void> {
  if (sessionId) await deleteSession(sessionId)
}

/** 当前会话用户：会话无效或账户不可用一律返回未授权。 */
export async function currentUser(sessionId: string | null): Promise<PublicUser> {
  if (!sessionId) throw new DomainError('AUTH_REQUIRED', '请先登录')
  const session = await findActiveSession(sessionId)
  if (!session) throw new DomainError('AUTH_REQUIRED', '请先登录')
  const row = await findUserById(session.user_id)
  if (!row || row.status !== 'active') {
    throw new DomainError('AUTH_REQUIRED', '请先登录')
  }
  return toPublicUser(row)
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}
