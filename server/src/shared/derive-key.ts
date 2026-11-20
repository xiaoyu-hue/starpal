// SPDX-License-Identifier: AGPL-3.0-or-later
import { hkdfSync } from 'node:crypto'
import { appEnv } from '../config/env.js'

/**
 * 从单一主密钥 SESSION_SECRET 派生各用途独立子密钥（域分离，domain separation）。
 *
 * 为什么：一个密钥裸用于多处 HMAC 时，某处若意外泄露 HMAC 输出或暴露输入/输出对，
 * 理论上会波及共用该密钥的其它用途。HKDF 用不同 info 派生互不相关的子密钥，
 * 把每个用途的密码学影响面彼此隔开（纵深加固，攻防模拟建议 4）。
 *
 * 兼容性分工（重要）：
 * - 纯计算、无长期存储、或影响窗口极短的用途（来源摘要、ALTCHA 一次性消费键）
 *   迁到独立子密钥；改动只让当前限流窗口 / 20 分钟内的临时态重算，无持久副作用。
 * - 邀请码哈希是长期存储值，改动会让所有存量未用邀请码失效，故**保持原派生**，
 *   在 invite.repository.ts 就地注明。不为了"整齐"牺牲真实数据。
 */
export const SUBKEY_INFO = {
  /** 限流来源摘要（IP → 不可逆标识）。 */
  subject: 'starpal-subject-v1',
  /** ALTCHA 一次性消费键（载荷 → 不可逆键）。 */
  altchaConsumed: 'starpal-altcha-consumed-v1',
} as const

/** 从 SESSION_SECRET 派生 32 字节子密钥，返回 hex 字符串，供 createHmac 直接使用。 */
export function deriveSubkey(info: string): string {
  const derived = hkdfSync('sha256', appEnv.sessionSecret, '', info, 32)
  return Buffer.from(derived).toString('hex')
}
