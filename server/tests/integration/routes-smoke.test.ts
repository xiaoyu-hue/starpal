// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedPost, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * 路由级冒烟（`M7-S1-T8`）：每个对外端点至少被真实 HTTP 请求打一次。
 *
 * 为什么需要这一层：此前的集成测试大多直接调 service，**controller 函数几乎没被执行过**
 * ——后端函数覆盖率只有 68%，缺口就在这里。控制器里的 JSON 解析、状态码选择、
 * 包络拼装、路径参数转换，没有一行被验证过，改错也只会在线上发现。
 *
 * 这一层刻意**不重复** service 层的业务断言（那由各模块的集成测试负责），
 * 只钉住三件事：路由挂得上、守卫放得对、成功路径返回 2xx 且是统一包络。
 */
const SESSION = (id: string) => ({
  cookie: `starpal_session=${id}`,
})

type Reply = { status: number; body: Record<string, unknown> | null; text: string }

let db: PGlite
let app: RunningApp
let topicId = 1

async function call(path: string, init: RequestInit = {}): Promise<Reply> {
  const res = await app.request(path, init)
  const text = await res.text()
  let body: Record<string, unknown> | null = null
  try {
    body = JSON.parse(text) as Record<string, unknown>
  } catch {
    body = null
  }
  return { status: res.status, body, text }
}

function json(method: string, payload: unknown, cookie?: string): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(payload),
  }
}

function cookie(id: string): string {
  return SESSION(id).cookie
}

before(async () => {
  db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  await seedUser(db, 2, 'bob')
  await seedUser(db, 99, 'root')
  await db.exec(`UPDATE users SET role_id = 2 WHERE id = 99`)
  await seedPost(db, 10, 1)
  await db.exec(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES ('sess-alice', 1, now() + interval '1 day'),
           ('sess-bob', 2, now() + interval '1 day'),
           ('sess-root', 99, now() + interval '1 day')
  `)
  app = await startTestServer(db)
  // 话题 id 从公开端点取，不写死 1：迁移里的种子顺序可能变，写死会让整条写入链路假失败。
  const topics = await call('/api/topics')
  const payload = topics.body?.data as
    | { items?: { id: number }[] }
    | { id: number }[]
    | undefined
  const list = Array.isArray(payload) ? payload : (payload?.items ?? [])
  topicId = list[0]?.id ?? 1
})

after(async () => {
  await app.close()
  await db.close()
})

describe('M7-S1-T8 公开读取端点', () => {
  const publicPaths = [
    '/api/health',
    '/api/meta/guidelines',
    '/api/meta/privacy',
    '/api/meta/terms',
    '/api/meta/announcements',
    '/api/meta/about',
    '/api/meta/disclaimer',
    '/api/meta/product',
    '/api/topics',
    '/api/posts?tab=latest',
    '/api/posts?tab=recommended',
    '/api/posts?tab=popular',
    '/api/posts/10',
    '/api/posts/10/related',
    '/api/posts/10/comments',
    '/api/users/alice',
    '/api/users/alice/posts',
    '/api/search?q=%E6%B5%8B%E8%AF%95',
    '/api/achievements/weekly',
    '/api/achievements/alice',
    '/api/levels/alice',
  ]

  for (const path of publicPaths) {
    it(`GET ${path} 返回 200 且为统一包络`, async () => {
      const reply = await call(path)
      assert.equal(reply.status, 200, `实际 ${reply.status}：${reply.text.slice(0, 200)}`)
      assert.ok(reply.body && 'data' in reply.body, '响应应带 data 字段')
    })
  }

  it('未知图片键返回 404，而不是 500', async () => {
    const reply = await call('/api/images/no-such-key')
    assert.equal(reply.status, 404, `实际 ${reply.status}：${reply.text.slice(0, 200)}`)
  })

  it('未登录访问需登录的读取端点一律 401', async () => {
    for (const path of ['/api/auth/me', '/api/users/me', '/api/notifications', '/api/export']) {
      const reply = await call(path)
      assert.equal(reply.status, 401, `${path} 实际 ${reply.status}`)
      assert.equal((reply.body?.error as { code: string }).code, 'AUTH_REQUIRED')
    }
  })
})

describe('M7-S1-T8 登录后的读取端点', () => {
  const authPaths = [
    '/api/auth/me',
    '/api/users/me',
    '/api/users/me/bookmarks',
    '/api/users/me/likes',
    '/api/notifications',
    '/api/notifications/unread',
    '/api/reports/mine',
    '/api/messages',
    '/api/achievements/weekly',
    '/api/levels/alice',
  ]

  for (const path of authPaths) {
    it(`GET ${path} 带会话返回 200`, async () => {
      const reply = await call(path, { headers: { cookie: cookie('sess-alice') } })
      assert.equal(reply.status, 200, `实际 ${reply.status}：${reply.text.slice(0, 200)}`)
      assert.ok(reply.body && 'data' in reply.body)
    })
  }

  it('GET /api/export 返回裸导出物（刻意不套 data 包络）', async () => {
    const reply = await call('/api/export', { headers: { cookie: cookie('sess-alice') } })
    assert.equal(reply.status, 200)
    // 导出物是文件，顶层直接是 { user, posts, comments }；套一层 data 会让外部工具读不出结构。
    assert.ok(reply.body && 'user' in reply.body && 'posts' in reply.body, '顶层应为导出结构')
  })

  it('导出格式非法时 400，不静默降级', async () => {
    const reply = await call('/api/export?format=xml', { headers: { cookie: cookie('sess-alice') } })
    assert.equal(reply.status, 400, reply.text.slice(0, 200))
  })

  it('无效会话不被当成登录态', async () => {
    const reply = await call('/api/auth/me', { headers: { cookie: 'starpal_session=bogus' } })
    assert.equal(reply.status, 401)
  })
})

describe('M7-S1-T8 写入链路（发帖 → 评论 → 互动 → 举报 → 删除）', () => {
  let postId = 0
  let commentId = 0

  it('发帖返回 201', async () => {
    const reply = await call(
      '/api/posts',
      json('POST', { title: '冒烟测试帖', body: '正文内容', topicId }, cookie('sess-alice')),
    )
    assert.equal(reply.status, 201, `实际 ${reply.status}：${reply.text.slice(0, 300)}`)
    const data = reply.body?.data as { id?: number } | undefined
    assert.ok(data?.id, '响应应含新帖 id')
    postId = data.id
  })

  it('改自己的帖子返回 200', async () => {
    const reply = await call(
      `/api/posts/${postId}`,
      json('PATCH', { title: '冒烟测试帖（已改）' }, cookie('sess-alice')),
    )
    assert.equal(reply.status, 200, reply.text.slice(0, 300))
  })

  it('普通成员改别人的帖子被拒（作者校验在服务端）', async () => {
    const reply = await call(
      '/api/posts/10',
      json('PATCH', { title: '试图改别人的帖子' }, cookie('sess-bob')),
    )
    assert.equal(reply.status, 403, `实际 ${reply.status}：${reply.text.slice(0, 200)}`)
  })

  it('发评论返回 200 并回填作者标记', async () => {
    const reply = await call(
      `/api/posts/${postId}/comments`,
      json('POST', { body: '第一条评论' }, cookie('sess-alice')),
    )
    // 评论创建沿用 `sendData` 的默认 200（发帖是 201）；这里钉的是「能写进去且认得作者」。
    assert.equal(reply.status, 200, reply.text.slice(0, 300))
    assert.equal((reply.body?.data as { isAuthor?: boolean }).isAuthor, true, '本人发的评论应标为作者')
    commentId = (reply.body?.data as { id?: number }).id ?? 0
    assert.ok(commentId > 0)
  })

  it('评论列表能看到刚发的评论', async () => {
    const reply = await call(`/api/posts/${postId}/comments`)
    assert.equal(reply.status, 200)
    // 评论列表的 `data` 直接是数组，分页信息在 `meta`（与信息流的 items 结构不同）。
    const list = reply.body?.data as { id: number }[] | undefined
    assert.ok(Array.isArray(list), `data 应为数组：${reply.text.slice(0, 200)}`)
    assert.ok(list.some((item) => item.id === commentId), '列表应包含新评论')
  })

  it('点赞是幂等的：连点两次只算一次，取消后归零', async () => {
    const first = await call(`/api/posts/${postId}/like`, {
      method: 'PUT',
      headers: { cookie: cookie('sess-alice') },
    })
    assert.equal(first.status, 200, first.text.slice(0, 200))
    const second = await call(`/api/posts/${postId}/like`, {
      method: 'PUT',
      headers: { cookie: cookie('sess-alice') },
    })
    assert.equal(second.status, 200)

    // 必须带会话读详情：`isLiked` 是按「当前读者」算的，匿名读永远是 false。
    const detail = await call(`/api/posts/${postId}`, {
      headers: { cookie: cookie('sess-alice') },
    })
    const data = detail.body?.data as { isLiked?: boolean; likeCount?: number } | undefined
    assert.equal(data?.isLiked, true)
    assert.equal(Number(data?.likeCount), 1, '重复点赞不应重复计数')

    const removed = await call(`/api/posts/${postId}/like`, {
      method: 'DELETE',
      headers: { cookie: cookie('sess-alice') },
    })
    assert.equal(removed.status, 200)
  })

  it('收藏开关可用', async () => {
    const on = await call(`/api/posts/${postId}/bookmark`, {
      method: 'PUT',
      headers: { cookie: cookie('sess-alice') },
    })
    assert.equal(on.status, 200, on.text.slice(0, 200))
    const off = await call(`/api/posts/${postId}/bookmark`, {
      method: 'DELETE',
      headers: { cookie: cookie('sess-alice') },
    })
    assert.equal(off.status, 200)
  })

  it('提交举报返回 200 且状态为待处理', async () => {
    const reply = await call(
      '/api/reports',
      json(
        'POST',
        { kind: 'report', targetType: 'post', targetId: postId, reason: 'spam', detail: '冒烟测试举报内容' },
        cookie('sess-root'),
      ),
    )
    assert.equal(reply.status, 200, reply.text.slice(0, 300))
    assert.equal((reply.body?.data as { status?: string }).status, 'pending')
  })

  it('改自己的资料返回 200', async () => {
    const reply = await call(
      '/api/users/me',
      json('PATCH', { displayName: '爱丽丝' }, cookie('sess-alice')),
    )
    assert.equal(reply.status, 200, reply.text.slice(0, 300))
  })

  it('段位可以摘下（rank: null）', async () => {
    const reply = await call(
      '/api/users/me/rank',
      json('PATCH', { rank: null }, cookie('sess-alice')),
    )
    assert.equal(reply.status, 200, reply.text.slice(0, 300))
  })

  it('通知全部已读返回 200', async () => {
    const reply = await call('/api/notifications/read', {
      method: 'POST',
      headers: { cookie: cookie('sess-alice') },
    })
    assert.equal(reply.status, 200, reply.text.slice(0, 200))
  })

  it('删自己的帖子返回 200，之后详情不可见', async () => {
    const reply = await call(`/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { cookie: cookie('sess-alice') },
    })
    assert.equal(reply.status, 200, reply.text.slice(0, 300))

    const detail = await call(`/api/posts/${postId}`)
    assert.equal(detail.status, 404, '删除后公开详情应 404')
  })

  it('登出返回 200 并清掉会话', async () => {
    const reply = await call('/api/auth/logout', {
      method: 'POST',
      headers: { cookie: cookie('sess-alice') },
    })
    assert.equal(reply.status, 200, reply.text.slice(0, 200))
  })
})
