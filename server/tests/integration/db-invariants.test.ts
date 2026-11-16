// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { withTransaction } from '../../src/db/pool.js'
import { createMigratedDb, migrationFiles } from '../helpers/db.js'
import { startTestServer, type RunningApp } from '../helpers/http.js'

/**
 * 数据库层不变量（`M7-S1-T9`）。
 *
 * 应用层的测试都在假设「库是对的」：迁移能跑、事务真能回滚、外键和约束真的拦得住。
 * 这些假设一旦不成立，上层测试会集体变成假绿——所以单独钉一层。
 *
 * 不做的事：不重测各表的业务约束（那由 `022` / `interactions-schema` 等迁移测试覆盖），
 * 这里只钉「结构完整」「事务语义」「编号规范」这三件与业务无关的地基。
 */
describe('M7-S1-T9 迁移文件规范', () => {
  it('编号从 001 起连续、无重复，且命名统一', () => {
    const files = migrationFiles()
    assert.ok(files.length > 0, '应至少有一个迁移')

    const versions = files.map((name) => name.slice(0, 3))
    assert.equal(new Set(versions).size, versions.length, '版本号不得重复')

    versions.forEach((version, index) => {
      const expected = String(index + 1).padStart(3, '0')
      assert.equal(version, expected, `第 ${index + 1} 个迁移应为 ${expected}，实际 ${version}`)
    })

    for (const name of files) {
      assert.match(name, /^\d{3}_[a-z0-9_]+\.sql$/, `命名不符合规范：${name}`)
    }
  })

  it('文件列表按名称升序即为应用顺序（零填充保证了这一点）', () => {
    const sorted = [...migrationFiles()].sort()
    assert.deepEqual(migrationFiles(), sorted, '迁移必须无需额外排序即可按序执行')
  })
})

describe('M7-S1-T9 从零建库', () => {
  let db: PGlite

  before(async () => {
    db = await createMigratedDb()
  })

  after(async () => {
    await db.close()
  })

  it('全部迁移在空库上执行成功，关键表齐全', async () => {
    const expected = [
      'users',
      'roles',
      'topics',
      'posts',
      'comments',
      'likes',
      'bookmarks',
      'notifications',
      'conversations',
      'messages',
      'post_images',
      'image_blobs',
      'reports',
      'moderation_logs',
      'sessions',
      'invite_codes',
    ]
    const result = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )
    const present = new Set(result.rows.map((row) => row.table_name))
    for (const table of expected) {
      assert.ok(present.has(table), `缺少表 ${table}`)
    }
  })

  it('角色种子存在且管理员角色名稳定（守卫依赖这个名字）', async () => {
    const result = await db.query<{ name: string }>('SELECT name FROM roles ORDER BY id')
    const names = result.rows.map((row) => row.name)
    // 守卫用的就是字面量 'admin'（`ROLE_ADMIN`），种子改名会让所有管理端点静默变成 403。
    assert.ok(names.includes('admin'), `角色种子应包含 admin，实际 ${names.join(',')}`)
    assert.ok(names.includes('user'), `角色种子应包含 user，实际 ${names.join(',')}`)
  })
})

describe('M7-S1-T9 事务边界', () => {
  let db: PGlite
  let app: RunningApp

  before(async () => {
    db = await createMigratedDb()
    // 借 HTTP 夹具把模块级连接池接到内存库上，这样测的是**真实的** withTransaction。
    app = await startTestServer(db)
    await db.exec(`INSERT INTO users (id, username, password_hash, display_name) VALUES (1, 'txn', 'x', 'txn')`)
  })

  after(async () => {
    await app.close()
    await db.close()
  })

  it('工作单元抛错时整体回滚，已写入的行不留下', async () => {
    await assert.rejects(
      withTransaction(async (client) => {
        await client.query(`INSERT INTO topics (slug, name_zh, name_en, sort_order) VALUES ('txn-rollback', '回滚', 'rollback', 999)`)
        throw new Error('boom')
      }),
      /boom/,
    )

    const result = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM topics WHERE slug = 'txn-rollback'`,
    )
    assert.equal(result.rows[0]?.count, '0', '回滚后不应留下半成品')
  })

  it('工作单元正常结束时提交，数据可见', async () => {
    await withTransaction(async (client) => {
      await client.query(`INSERT INTO topics (slug, name_zh, name_en, sort_order) VALUES ('txn-commit', '提交', 'commit', 998)`)
    })

    const result = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM topics WHERE slug = 'txn-commit'`,
    )
    assert.equal(result.rows[0]?.count, '1')
  })

  it('回滚的异常会原样抛给调用方，不被静默吞掉', async () => {
    class Marker extends Error {}
    await assert.rejects(
      withTransaction(async () => {
        throw new Marker('marker')
      }),
      (error: unknown) => error instanceof Marker,
    )
  })
})
