// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { AVATAR_STYLES, AVATAR_STYLE_SLUGS } from '../../src/config/avatar-styles.js'
import { AVATAR_STYLE_OBJECTS } from '../../src/modules/images/avatar-generators.js'
import { createMigratedDb } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * 自托管头像端点回归（真实 Express 链路）：
 * 1. 31 种风格全部能生成合法 SVG，且清单与生成器映射严格一致；
 * 2. 确定性：同风格同种子两次输出逐字节相同；
 * 3. 安全：非法风格 / 空种子 / 注入字符被拒；SVG 无脚本；响应带沙箱 CSP 与 nosniff；
 * 4. 历史 SVG 注入漏洞相关参数（rotate / fontSize / fontWeight）不进入生成路径。
 */
let db: PGlite
let app: RunningApp

function avatarUrl(style: string, seed: string): string {
  return `/api/avatars/${style}?seed=${encodeURIComponent(seed)}`
}

before(async () => {
  db = await createMigratedDb()
  app = await startTestServer(db)
})

after(async () => {
  await app.close()
  await db.close()
})

describe('头像风格清单完整性', () => {
  it('清单 31 项且与生成器映射的 slug 集合完全一致', () => {
    assert.equal(AVATAR_STYLES.length, 31)
    const fromManifest = [...AVATAR_STYLE_SLUGS].sort()
    const fromGenerators = Object.keys(AVATAR_STYLE_OBJECTS).sort()
    assert.deepEqual(fromManifest, fromGenerators)
  })

  it('每个风格都有作者与许可署名（CC BY 必须给出许可链接）', () => {
    for (const style of AVATAR_STYLES) {
      assert.ok(style.author.length > 0, `${style.slug} 缺作者`)
      assert.ok(style.license.length > 0, `${style.slug} 缺许可`)
      assert.ok(style.sourceUrl.startsWith('https://'), `${style.slug} 缺来源链接`)
      if (style.license.includes('CC BY')) {
        assert.ok(style.licenseUrl, `${style.slug} 是 CC BY 却缺许可链接`)
      }
    }
  })
})

describe('头像生成端点', () => {
  it('31 种风格全部返回 200 且为合法 SVG', async () => {
    for (const slug of AVATAR_STYLE_SLUGS) {
      const res = await app.request(avatarUrl(slug, '星聚用户'))
      assert.equal(res.status, 200, `${slug} 应返回 200`)
      const text = await res.text()
      assert.match(text, /^<svg[\s>]/, `${slug} 应返回 SVG`)
      assert.ok(text.length > 100, `${slug} SVG 不应为空壳`)
    }
  })

  it('同风格同种子两次生成逐字节相同（确定性）', async () => {
    const a = await (await app.request(avatarUrl('bottts', 'alice'))).text()
    const b = await (await app.request(avatarUrl('bottts', 'alice'))).text()
    assert.equal(a, b)
    const c = await (await app.request(avatarUrl('bottts', 'bob'))).text()
    assert.notEqual(a, c, '不同种子应生成不同头像')
  })

  it('响应带沙箱 CSP、nosniff 与不可变缓存头', async () => {
    const res = await app.request(avatarUrl('identicon', 'abc'))
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /image\/svg\+xml/)
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    const csp = res.headers.get('content-security-policy') ?? ''
    assert.match(csp, /default-src 'none'/)
    assert.match(csp, /sandbox/)
    assert.match(res.headers.get('cache-control') ?? '', /immutable/)
  })

  it('生成的 SVG 不含脚本与事件处理器', async () => {
    for (const slug of ['adventurer', 'initials', 'open-peeps', 'pixel-art']) {
      const text = await (await app.request(avatarUrl(slug, '<script>x</script>'))).text()
      // 种子里的尖括号被输入校验拒绝，但这里也确认即便进入生成也不会有可执行脚本。
      assert.doesNotMatch(text, /<script[\s>]/i, `${slug} SVG 不应含 script 标签`)
      assert.doesNotMatch(text, /on(error|load)\s*=/i, `${slug} SVG 不应含事件处理器`)
    }
  })

  it('非法风格返回 400', async () => {
    const res = await app.request(avatarUrl('no-such-style', 'abc'))
    assert.equal(res.status, 400)
  })

  it('空种子被拒（缺 seed 参数）', async () => {
    const res = await app.request('/api/avatars/identicon')
    assert.equal(res.status, 400)
  })

  it('含注入字符的种子被拒', async () => {
    for (const seed of ['<svg>', 'a/b', 'x?y', 'a&b', '"quoted"']) {
      const res = await app.request(avatarUrl('identicon', seed))
      assert.equal(res.status, 400, `种子 ${seed} 应被拒绝`)
    }
  })

  it('超长种子被拒', async () => {
    const res = await app.request(avatarUrl('identicon', 'a'.repeat(65)))
    assert.equal(res.status, 400)
  })

  it('历史漏洞参数不会进入生成结果（rotate / fontSize / fontWeight）', async () => {
    // 即便请求里带上这些参数，生成器也只读 seed 与固定 size，输出不受影响。
    const base = await (await app.request(avatarUrl('initials', 'AB'))).text()
    const withEvil = await (await app.request('/api/avatars/initials?seed=AB&rotate=%22%3E%3Cscript%3E&fontSize=999&fontWeight=bold')).text()
    assert.equal(base, withEvil, '额外参数不得改变输出')
    assert.doesNotMatch(withEvil, /<script[\s>]/i)
  })
})
