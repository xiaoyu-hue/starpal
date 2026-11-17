// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHmac, hkdfSync } from 'node:crypto'
import { createChallenge, solveChallenge } from 'altcha-lib'
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2'
import {
  ALTCHA_ALGORITHM,
  ALTCHA_COST,
  ALTCHA_HKDF_INFO,
} from '../../src/config/altcha-constants.js'
import { appEnv } from '../../src/config/env.js'

/**
 * 人机验证测试夹具：用与生产同一套密钥派生、同一套算法，真实求解一份挑战，
 * 产出 widget 提交的那种 base64 载荷。
 *
 * 刻意不提供「跳过验证」的后门开关——测试走的是完整密码学闭环，
 * 只是把求解放在 Node 里做（浏览器里由 widget 的 Worker 做），保证守卫逻辑被真实执行。
 */

function hmacSecret(): string {
  const derived = hkdfSync('sha256', appEnv.sessionSecret, '', ALTCHA_HKDF_INFO, 32)
  return Buffer.from(derived).toString('hex')
}

/** 生成一份有效载荷；返回 { payload, raw }，raw 为同一载荷文本（用于重放测试）。 */
export async function mintAltcha(): Promise<{ payload: string; hash: string }> {
  const challenge = await createChallenge({
    algorithm: ALTCHA_ALGORITHM,
    cost: ALTCHA_COST,
    deriveKey,
    hmacSignatureSecret: hmacSecret(),
    expiresAt: Math.floor(Date.now() / 1000) + 600,
  })
  const solution = await solveChallenge({ challenge, deriveKey })
  if (!solution) throw new Error('测试挑战求解失败')
  const payload = Buffer.from(JSON.stringify({ challenge, solution })).toString('base64')
  const hash = createHmac('sha256', appEnv.sessionSecret).update(payload).digest('hex')
  return { payload, hash }
}
