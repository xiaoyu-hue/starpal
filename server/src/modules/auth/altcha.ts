// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHmac, hkdfSync } from 'node:crypto'
import { createChallenge, verifySolution } from 'altcha-lib'
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2'
import {
  ALTCHA_ALGORITHM,
  ALTCHA_COST,
  ALTCHA_EXPIRY_SECONDS,
  ALTCHA_HKDF_INFO,
} from '../../config/altcha-constants.js'
import { appEnv } from '../../config/env.js'
import { DomainError } from '../../shared/errors.js'

/**
 * ALTCHA 人机验证核心（自托管，零外部服务）。
 *
 * 用工作量证明（PoW：让浏览器算一小道题）代替猜图验证码：真人几乎无感，
 * 脚本则要为每个请求付出真实算力。不依赖 cookie、设备指纹或第三方 API。
 *
 * 密钥不新增环境变量：从已有的 SESSION_SECRET 经 HKDF 派生专用子密钥，
 * 与人会话签名做密钥隔离（轮换 SESSION_SECRET 会同时轮换本密钥，属预期行为）。
 */

/** 从会话密钥派生 ALTCHA 专用 HMAC 密钥；HKDF info 提供域隔离。 */
function hmacSecret(): string {
  const derived = hkdfSync('sha256', appEnv.sessionSecret, '', ALTCHA_HKDF_INFO, 32)
  return Buffer.from(derived).toString('hex')
}

/**
 * 生成一次性挑战，序列化为 widget 可直接消费的 JSON 字符串。
 * 挑战自带过期时间；一次性由 consumed 表在校验时保证。
 */
export async function newChallenge(): Promise<string> {
  const challenge = await createChallenge({
    algorithm: ALTCHA_ALGORITHM,
    cost: ALTCHA_COST,
    deriveKey,
    hmacSignatureSecret: hmacSecret(),
    expiresAt: Math.floor(Date.now() / 1000) + ALTCHA_EXPIRY_SECONDS,
  })
  return JSON.stringify(challenge)
}

/** 提交载荷的解码结果：挑战 + 解答。 */
type DecodedPayload = { challenge: Parameters<typeof verifySolution>[0]['challenge']; solution: Parameters<typeof verifySolution>[0]['solution'] }

/** 解码并校验 widget 提交的 base64 载荷。任何畸形输入都按校验失败处理，不外泄细节。 */
export async function verify(payload: string): Promise<{ ok: boolean; hash: string }> {
  let decoded: DecodedPayload
  try {
    const json = Buffer.from(payload, 'base64').toString('utf8')
    decoded = JSON.parse(json) as DecodedPayload
  } catch {
    throw new DomainError('CHALLENGE_INVALID', '人机验证未通过，请重试')
  }

  if (!decoded?.challenge || !decoded?.solution) {
    throw new DomainError('CHALLENGE_INVALID', '人机验证未通过，请重试')
  }

  let verified = false
  try {
    const result = await verifySolution({
      challenge: decoded.challenge,
      solution: decoded.solution,
      deriveKey,
      hmacSignatureSecret: hmacSecret(),
    })
    verified = result.verified
  } catch {
    verified = false
  }

  if (!verified) {
    throw new DomainError('CHALLENGE_INVALID', '人机验证未通过，请重试')
  }

  // 用载荷原文的不可逆摘要作一次性键，不落原文本身。
  return { ok: true, hash: createHmac('sha256', appEnv.sessionSecret).update(payload).digest('hex') }
}
