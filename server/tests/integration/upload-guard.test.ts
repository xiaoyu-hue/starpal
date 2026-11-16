// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import sharp from 'sharp'
import { createMigratedDb, seedPost, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * `M7-S1-T4` 传输层用例：请求在到达图片管线之前，先在 HTTP 边界被挡一次。
 *
 * 分两层防守是刻意的——管线负责「这是什么内容」，中间件负责「允许多大、几张、字段叫什么」。
 * 前者防的是可执行内容混进图片，后者防的是拿 4 GB 请求体打穿内存。
 * 这里只测后者：未登录、字段名不对、超限、以及一个成功样本证明链路没被误伤。
 */

type Part = { field: string; filename: string; contentType: string; content: Buffer }

function multipart({ field, filename, contentType, content }: Part): {
  body: Buffer
  contentType: string
} {
  const boundary = '----starpal-test-boundary'
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${field}"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`,
    'utf8',
  )
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
  return {
    body: Buffer.concat([head, content, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

describe('M7-S1-T4 上传接口边界', () => {
  let db: PGlite
  let app: RunningApp
  let png: Buffer

  before(async () => {
    db = await createMigratedDb()
    await seedUser(db, 1, 'alice')
    await seedUser(db, 99, 'root')
    await db.exec(`UPDATE users SET role_id = 2 WHERE id = 99`)
    await seedPost(db, 10, 1)
    await db.exec(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES ('sess-alice', 1, now() + interval '1 day'),
             ('sess-admin', 99, now() + interval '1 day')
    `)
    app = await startTestServer(db)
    png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#00ff00' } })
      .png()
      .toBuffer()
  })

  after(async () => {
    await app.close()
    await db.close()
  })

  function post(part: Part, cookie?: string): Promise<Response> {
    const form = multipart(part)
    const headers: Record<string, string> = { 'content-type': form.contentType }
    if (cookie) headers.cookie = cookie
    return app.request('/api/posts/10/images', { method: 'POST', headers, body: form.body })
  }

  it('未登录上传被拒，且不必先收完请求体', async () => {
    const res = await post({ field: 'image', filename: 'a.png', contentType: 'image/png', content: png })
    assert.equal(res.status, 401)
    const body = (await res.json()) as { error: { code: string } }
    assert.equal(body.error.code, 'AUTH_REQUIRED')
  })

  it('字段名不是 image 时被拒，不静默忽略', async () => {
    const res = await post(
      { field: 'file', filename: 'a.png', contentType: 'image/png', content: png },
      'starpal_session=sess-alice',
    )
    assert.equal(res.status, 400)
    const body = (await res.json()) as { error: { code: string; message: string } }
    assert.equal(body.error.code, 'VALIDATION_FAILED')
    assert.match(body.error.message, /image/)
  })

  it('超过单张上限的请求被拒为 413', async () => {
    const oversized = Buffer.alloc(3 * 1024 * 1024 + 256 * 1024, 0x41)
    const res = await post(
      { field: 'image', filename: 'big.png', contentType: 'image/png', content: oversized },
      'starpal_session=sess-alice',
    )
    assert.equal(res.status, 413)
    const body = (await res.json()) as { error: { code: string } }
    assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE')
  })

  it('扩展名伪装成图片的可执行内容被拒为 415', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    const res = await post(
      { field: 'image', filename: 'photo.jpg', contentType: 'image/jpeg', content: svg },
      'starpal_session=sess-admin',
    )
    assert.equal(res.status, 415)
    const body = (await res.json()) as { error: { code: string } }
    assert.equal(body.error.code, 'UNSUPPORTED_MEDIA_TYPE')
  })

  it('合法图片通过并被统一转成 WebP', async () => {
    // 用管理员身份走成功路径：PGlite 的 BIGINT 回读是 number，而生产 pg 回读是 string，
    // 「是否作者」的比对（`String(authorId) === viewer.id`）在内存库下会误判；
    // 管理员分支不看归属，绕开这层夹具差异，测的仍是上传链路本身。
    const res = await post(
      { field: 'image', filename: '../../etc/passwd.png', contentType: 'image/png', content: png },
      'starpal_session=sess-admin',
    )
    if (res.status !== 201) assert.fail(`实际 ${res.status}：${await res.text()}`)
    const body = (await res.json()) as {
      data: { url: string; mimeType: string; width: number; height: number }
    }
    assert.equal(body.data.mimeType, 'image/webp')
    assert.equal(body.data.width, 8)
    assert.match(body.data.url, /^\/api\/images\/[0-9a-f]{32}$/)
  })
})
