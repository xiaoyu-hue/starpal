// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request } from 'express'
import type { PGlite } from '@electric-sql/pglite'
import { appEnv } from '../../src/config/env.js'
import {
  enforceLoginFailLimit,
  enforcePasswordChangeLimit,
} from '../../src/modules/auth/rate-limit.js'
import { subjectHashOf } from '../../src/modules/auth/index.js'
import { createMigratedDb } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * 认证防刷回归（审查 H1 / M2）：
 * 1. 登录失败、改密失败限次确实会在阈值处拒绝——此前零测试覆盖，改坏不会有任何用例变红；
 * 2. 限流来源摘要不包含 User-Agent：同一 IP 换任意 UA 必须落到同一个桶，
 *    否则攻击者每请求换一个 UA 就能绕过登录爆破防护与全部写接口限流。
 *
 * 直接对限流层断言（预置事件 → 调用函数），不依赖 ALTCHA/注册 HTTP 链路，稳定且直击核心。
 * startTestServer 会把全局 pool 接到 PGlite，故 limit 内部的 pool.query 落到测试库。
 */
const IP = '198.51.100.23'
const IP_OTHER = '198.51.100.24'
const HASH = hashForIp(IP)

function hashForIp(ip: string, ua?: string): string {
  return subjectHashOf({
    header: (name: string) => {
      const key = name.toLowerCase()
      if (key === 'x-forwarded-for') return ip
      if (key === 'user-agent') return ua
      return undefined
    },
    socket: { remoteAddress: undefined },
  } as unknown as Request)
}

let db: PGlite
let app: RunningApp

async function seedEvents(kind: string, hash: string, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await db.query('INSERT INTO security_events (kind, subject_hash) VALUES ($1, $2)', [kind, hash])
  }
}

async function countKind(kind: string): Promise<number> {
  const r = await db.query<{ n: string }>('SELECT count(*)::text AS n FROM security_events WHERE kind = $1', [kind])
  return Number(r.rows[0]?.n ?? '0')
}

before(async () => {
  db = await createMigratedDb()
  app = await startTestServer(db)
})

after(async () => {
  await app.close()
  await db.close()
})

describe('认证防刷：登录/改密失败限次', () => {
  it('登录失败未达阈值不拒绝', async () => {
    await db.query('DELETE FROM security_events')
    await seedEvents('login_fail', HASH, appEnv.loginFailMax - 1)
    await enforceLoginFailLimit(HASH) // 不抛即通过
  })

  it('登录失败达到阈值抛 RATE_LIMITED', async () => {
    await db.query('DELETE FROM security_events')
    await seedEvents('login_fail', HASH, appEnv.loginFailMax)
    await assert.rejects(() => enforceLoginFailLimit(HASH), (e: unknown) => {
      assert.equal((e as { code: string }).code, 'RATE_LIMITED')
      return true
    })
  })

  it('改密失败达到阈值抛 RATE_LIMITED', async () => {
    await db.query('DELETE FROM security_events')
    await seedEvents('password_change_fail', HASH, appEnv.loginFailMax)
    await assert.rejects(() => enforcePasswordChangeLimit(HASH), (e: unknown) => {
      assert.equal((e as { code: string }).code, 'RATE_LIMITED')
      return true
    })
  })

  it('登录失败与改密失败独立计数，互不串扰', async () => {
    await db.query('DELETE FROM security_events')
    await seedEvents('password_change_fail', HASH, appEnv.loginFailMax)
    await enforceLoginFailLimit(HASH) // login_fail 仍为 0，不拒绝
    assert.equal(await countKind('login_fail'), 0)
  })
})

describe('认证防刷：限流摘要不可被 UA 绕过（H1 回归）', () => {
  it('同一 IP 任意 UA 得到相同摘要', () => {
    assert.equal(hashForIp(IP), hashForIp(IP, 'curl/8.0'))
    assert.equal(hashForIp(IP), hashForIp(IP, 'random-ua-'.repeat(20)))
    assert.equal(hashForIp(IP), hashForIp(IP, ''))
  })

  it('不同 IP 得到不同摘要，限流仍按来源隔离', () => {
    assert.notEqual(hashForIp(IP), hashForIp(IP_OTHER))
  })

  it('换 UA 不能给同一 IP 变出新限流桶（中间件链路）', async () => {
    await db.query('DELETE FROM security_events')
    // 用「旧 UA」对应的摘要预置到上限（直接插库，避免依赖 middleware 记录次数）。
    // 再用全新 UA 走一次中间件：若 UA 参与摘要，会算出新桶从而放行（测试失败）；
    // 当前实现 UA 不参与摘要，仍命中同一满桶 → next(error) 被拦。
    const oldHash = hashForIp(IP, 'ua-old')
    await seedEvents('post_create', oldHash, appEnv.rateLimitMax)
    const { writeRateLimit } = await import('../../src/modules/auth/write-rate-limit.js')
    const middleware = writeRateLimit('post_create')
    const mkReq = (ua: string) =>
      ({ header: (name: string) => (name.toLowerCase() === 'x-forwarded-for' ? IP : name.toLowerCase() === 'user-agent' ? ua : undefined), socket: { remoteAddress: undefined } }) as unknown as import('express').Request
    let blocked = false
    await middleware(mkReq('ua-brand-new'), {} as never, ((e?: unknown) => {
      if (e) blocked = true
    }) as never)
    assert.equal(blocked, true, '换 UA 后同一 IP 仍应被限流')
  })
})

/**
 * 威胁模型 A1：限流来源不得依赖「Vercel 覆盖而非追加 x-forwarded-for」这一平台假设。
 *
 * 真实链路上 x-forwarded-for 可能是 `伪造值, …, 真实IP`（追加模式 / 前置代理）。
 * 只要取最左一段，攻击者每次换一个伪造首值就能拿到全新摘要、绕过全部限流。
 * 这里把「取最右一跳」钉死：单值、追加、空值、缺失五种形态逐一对齐。
 */
function hashForXff(xff: string | undefined, socket?: string): string {
  return subjectHashOf({
    header: (name: string) => {
      const key = name.toLowerCase()
      if (key === 'x-forwarded-for') return xff
      return undefined
    },
    socket: { remoteAddress: socket },
  } as unknown as Request)
}

describe('限流来源：转发链只信最右一跳（威胁模型 A1）', () => {
  it('单值形态（Vercel 覆盖模式）与既有行为一致', () => {
    assert.equal(hashForXff(IP), HASH)
  })

  it('追加模式下伪造首值不改变摘要', () => {
    assert.equal(hashForXff(`1.2.3.4, ${IP}`), HASH)
  })

  it('任意长度的伪造前缀都得到同一摘要', () => {
    assert.equal(hashForXff(`9.9.9.9, 8.8.8.8, 7.7.7.7, ${IP}`), HASH)
    assert.equal(hashForXff(`  1.2.3.4 ,  ${IP}  `), HASH)
  })

  it('不同真实来源在追加模式下仍互相隔离', () => {
    assert.notEqual(hashForXff(`1.2.3.4, ${IP}`), hashForXff(`1.2.3.4, ${IP_OTHER}`))
  })

  it('空值/纯逗号回退到套接字地址，且与无头时一致', () => {
    const socketIp = '203.0.113.9'
    assert.equal(hashForXff('   ', socketIp), hashForXff(undefined, socketIp))
    assert.equal(hashForXff(',,,', socketIp), hashForXff(undefined, socketIp))
  })

  it('追加模式下写接口仍命中同一满桶（真实中间件链路）', async () => {
    await db.query('DELETE FROM security_events')
    await seedEvents('post_create', HASH, appEnv.rateLimitMax)
    const { writeRateLimit } = await import('../../src/modules/auth/write-rate-limit.js')
    const req = {
      header: (name: string) => (name.toLowerCase() === 'x-forwarded-for' ? `1.2.3.4, ${IP}` : undefined),
      socket: { remoteAddress: undefined },
    } as unknown as Request
    let blocked = false
    await writeRateLimit('post_create')(req, {} as never, ((e?: unknown) => {
      if (e) blocked = true
    }) as never)
    assert.equal(blocked, true, '伪造 XFF 首值不应解锁已被限流的来源')
  })
})

/**
 * 防漏回归（审查 L5）：所有写接口 kind 都必须能被限流中间件拦住。
 * 此前只有 post_create 一类被真 HTTP 测试覆盖，某个 kind 写错或漏挂不会有任何用例变红。
 * 这里遍历全部写类 kind，逐一预置满配额并断言中间件 next(error)。
 */
describe('写接口限流：所有 kind 均生效', () => {
  const WRITE_KINDS = [
    'post_create',
    'comment_create',
    'report_submit',
    'image_upload',
    'altcha_challenge',
    'altcha_fail',
  ] as const

  it('每个写类 kind 达到阈值都被拦（next 收到错误）', async () => {
    const { writeRateLimit } = await import('../../src/modules/auth/write-rate-limit.js')
    const mkReq = () =>
      ({
        header: (name: string) =>
          name.toLowerCase() === 'x-forwarded-for' ? IP : undefined,
        socket: { remoteAddress: undefined },
      }) as unknown as import('express').Request
    for (const kind of WRITE_KINDS) {
      await db.query('DELETE FROM security_events')
      await seedEvents(kind, HASH, appEnv.rateLimitMax)
      let blocked = false
      await writeRateLimit(kind)(mkReq(), {} as never, ((e?: unknown) => {
        if (e) blocked = true
      }) as never)
      assert.equal(blocked, true, `kind=${kind} 达到阈值应被限流`)
    }
  })

  it('未达阈值时所有写类 kind 都放行', async () => {
    const { writeRateLimit } = await import('../../src/modules/auth/write-rate-limit.js')
    const mkReq = () =>
      ({
        header: (name: string) =>
          name.toLowerCase() === 'x-forwarded-for' ? IP : undefined,
        socket: { remoteAddress: undefined },
      }) as unknown as import('express').Request
    for (const kind of WRITE_KINDS) {
      await db.query('DELETE FROM security_events')
      await seedEvents(kind, HASH, appEnv.rateLimitMax - 1)
      let passed = false
      await writeRateLimit(kind)(mkReq(), {} as never, ((e?: unknown) => {
        if (!e) passed = true
      }) as never)
      assert.equal(passed, true, `kind=${kind} 未达阈值应放行`)
    }
  })
})
