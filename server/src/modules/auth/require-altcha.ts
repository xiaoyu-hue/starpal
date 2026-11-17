// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { DomainError } from '../../shared/errors.js'
import { verify } from './altcha.js'
import { consumeOnce, pruneConsumed } from './altcha.repository.js'
import { note } from './rate-limit.js'
import { subjectHashOf } from './subject.js'

/**
 * 人机验证守卫：注册 / 登录前必须提交一次有效的 ALTCHA 载荷。
 *
 * 失败一律记安全事件并返回统一 400 包络，细节不差分（畸形 / 过期 / 重放对外一致），
 * 既不让脚本探测内部状态，也顺手占用它自己的来源配额。
 * 守卫只做「验证 + 原子消费」，不产生会话、不写业务数据。
 */
export async function requireAltcha(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const subject = subjectHashOf(req)
  try {
    const raw = (req.body as Record<string, unknown> | undefined)?.altcha
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new DomainError('CHALLENGE_INVALID', '人机验证未通过，请重试')
    }
    const { hash } = await verify(raw)
    const consumed = await consumeOnce(hash)
    if (!consumed) {
      throw new DomainError('CHALLENGE_INVALID', '人机验证未通过，请重试')
    }
    await pruneConsumed()
    next()
  } catch (error) {
    void note('altcha_fail', subject).catch(() => undefined)
    next(error)
  }
}
