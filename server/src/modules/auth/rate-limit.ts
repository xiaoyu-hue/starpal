// SPDX-License-Identifier: AGPL-3.0-or-later
import { appEnv } from '../../config/env.js'
import { DomainError } from '../../shared/errors.js'
import { countEvents, pruneExpiredData, recordEvent } from './auth.repository.js'
import type { SecurityEventKind } from '../../config/constants.js'

/**
 * 分层防刷（PRD FR-AUTH-14 / IMPLEMENTATION-PLAN M2-S2-T2）。
 *
 * 关键约束：Vercel Serverless 每次调用可能落在不同实例，进程内存计数器
 * 各自为政、形同虚设。因此所有计数必须落在 security_events 表，
 * 以来源不可逆摘要为键。清理同样在请求链路内完成，不引入外部调度。
 */

/** 记录一次安全事件，并顺带清理过期数据。 */
export async function note(kind: SecurityEventKind, subjectHash: string): Promise<void> {
  await recordEvent(kind, subjectHash)
  await pruneExpiredData(appEnv.securityEventRetentionDays)
}

/** 通用速率限制：时间窗内同类事件达到上限即拒绝。 */
export async function enforceRateLimit(
  kind: SecurityEventKind,
  subjectHash: string,
): Promise<void> {
  const used = await countEvents(kind, subjectHash, appEnv.rateLimitWindowSeconds)
  if (used >= appEnv.rateLimitMax) {
    throw new DomainError('RATE_LIMITED', '操作过于频繁，请稍后再试')
  }
}

/** 登录失败限次：连续失败达到上限后暂时拒绝，避免口令爆破。 */
export async function enforceLoginFailLimit(subjectHash: string): Promise<void> {
  const fails = await countEvents('login_fail', subjectHash, appEnv.rateLimitWindowSeconds)
  if (fails >= appEnv.loginFailMax) {
    throw new DomainError('RATE_LIMITED', '登录尝试过于频繁，请稍后再试')
  }
}
