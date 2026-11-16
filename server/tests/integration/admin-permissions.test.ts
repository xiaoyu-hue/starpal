// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { adminRouter } from '../../src/modules/admin/admin.routes.js'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * `AC-11` 权限矩阵自动化（M7-S1-T5）。
 *
 * 断言的是**路由层那道门**，不是服务层的二次校验：
 * - 访客（无 Cookie）→ `401 AUTH_REQUIRED`；
 * - 已登录普通成员 → `403 FORBIDDEN`；
 * - 管理员 → 不是 401 / 403（具体 200 还是 400 由入参决定，不在此关心）。
 *
 * 路由清单**从 `adminRouter.stack` 现取**，不写死：新增一个管理端点却忘了挂守卫，
 * 这条用例会自动把它纳入检查并失败——手写清单做不到这一点，它只会安静地漏掉新端点。
 */

type Layer = {
  name: string
  route?: { path: string; methods: Record<string, boolean> }
  handle?: { stack?: Layer[] }
}

type Endpoint = { method: string; path: string }

function directRoutes(): { endpoints: Endpoint[]; mounted: Layer[] } {
  const stack = (adminRouter as unknown as { stack: Layer[] }).stack
  const endpoints: Endpoint[] = []
  const mounted: Layer[] = []
  for (const layer of stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) {
        endpoints.push({ method: method.toUpperCase(), path: layer.route.path })
      }
    } else if (layer.handle?.stack) {
      mounted.push(layer)
    }
  }
  return { endpoints, mounted }
}

/** 子路由的前缀无法从 `stack` 稳定读出，显式登记并在下方断言「挂载数量」防止漏测。 */
const MOUNTED_PREFIX = ['/announcements']

/** 路径参数给合法值：这里测的是守卫，不是入参校验。 */
function concretePath(path: string): string {
  return path.replace(':kind', 'posts').replace(/:id|:imageId|:postId/g, '1')
}

function initOf(method: string): RequestInit {
  if (method === 'GET' || method === 'DELETE') return { method }
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: '{}',
  }
}

describe('M7-S1-T5 管理端点权限矩阵（HTTP 层）', () => {
  let db: PGlite
  let app: RunningApp
  let endpoints: Endpoint[] = []

  before(async () => {
    db = await createMigratedDb()
    await seedUser(db, 1, 'alice')
    await seedUser(db, 99, 'root')
    await db.exec(`UPDATE users SET role_id = 2 WHERE id = 99`)
    await db.exec(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES ('sess-member', 1, now() + interval '1 day'),
             ('sess-admin', 99, now() + interval '1 day')
    `)
    app = await startTestServer(db)

    const { endpoints: direct, mounted } = directRoutes()
    endpoints = [...direct]
    for (const prefix of MOUNTED_PREFIX) {
      // 子路由的 4 条（列表 / 新建 / 编辑 / 删除）逐一登记
      endpoints.push(
        { method: 'GET', path: `${prefix}` },
        { method: 'POST', path: `${prefix}` },
        { method: 'PATCH', path: `${prefix}/1` },
        { method: 'DELETE', path: `${prefix}/1` },
      )
    }
    assert.equal(mounted.length, MOUNTED_PREFIX.length, '新增了子路由，请同步登记前缀')
    assert.ok(endpoints.length >= 15, '路由数量异常偏少，可能没读到 adminRouter.stack')
  })

  after(async () => {
    await app.close()
    await db.close()
  })

  function call(path: string, method: string, cookie?: string): Promise<Response> {
    const init = initOf(method)
    if (cookie) init.headers = { ...(init.headers as Record<string, string>), cookie }
    return app.request(`/api/admin${concretePath(path)}`, init)
  }

  it('访客访问任一管理端点均为 401，且不泄露端点是否存在', async () => {
    for (const { method, path } of endpoints) {
      const res = await call(path, method)
      assert.equal(res.status, 401, `${method} ${path} 访客应被拒，实际 ${res.status}`)
      const body = (await res.json()) as { error?: { code?: string } }
      assert.equal(body.error?.code, 'AUTH_REQUIRED', `${method} ${path} 错误码不对`)
    }
  })

  it('已登录普通成员访问任一管理端点均为 403', async () => {
    for (const { method, path } of endpoints) {
      const res = await call(path, method, 'starpal_session=sess-member')
      assert.equal(res.status, 403, `${method} ${path} 普通成员应被拒，实际 ${res.status}`)
      const body = (await res.json()) as { error?: { code?: string } }
      assert.equal(body.error?.code, 'FORBIDDEN', `${method} ${path} 错误码不对`)
    }
  })

  it('管理员不会被守卫拦下（放行或入参报错均可）', async () => {
    for (const { method, path } of endpoints) {
      const res = await call(path, method, 'starpal_session=sess-admin')
      assert.ok(
        res.status !== 401 && res.status !== 403,
        `${method} ${path} 管理员被守卫误拦，实际 ${res.status}`,
      )
    }
  })

  it('守卫挂在 Router 上：前两层依次为认证与角色校验', async () => {
    const stack = (adminRouter as unknown as { stack: Layer[] }).stack
    assert.equal(stack[0]?.name, 'requireAuth', 'Router 第一层必须是 requireAuth')
    assert.ok(
      stack.slice(0, 2).some((layer) => layer.name !== 'requireAuth' && !layer.route),
      'Router 应在认证之后紧跟角色守卫',
    )
  })
})
