// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { attachViewerFlags } from '../../src/modules/interactions/interaction.flags.js'
import { runToggle, type Executor, type Row } from '../../src/modules/interactions/interaction.repository.js'
import { createMigratedDb, seedPost, seedUser } from '../helpers/db.js'

/** 读者互动态的批量补齐（避免 N+1，且不把 viewer 参数拼进帖子投影 SQL）。 */
describe('读者互动态批量补齐', () => {
  let db: PGlite
  let executor: Executor

  before(async () => {
    db = await createMigratedDb()
    executor = { query: (sql, params) => db.query<Row>(sql, params) }
    await seedUser(db, 1, 'alice')
    await seedUser(db, 2, 'bob')
    await seedPost(db, 10, 1)
    await seedPost(db, 11, 1)
    await runToggle(executor, 10, '1', true, { table: 'likes', column: 'like_count' })
    await runToggle(executor, 11, '1', true, { table: 'bookmarks', column: 'bookmark_count' })
  })

  after(async () => {
    await db.close()
  })

  it('匿名读者：全部为 false', async () => {
    const items = await attachViewerFlags([{ id: 10 }, { id: 11 }], null, executor)
    assert.deepEqual(items.map((item) => [item.isLiked, item.isBookmarked]), [
      [false, false],
      [false, false],
    ])
  })

  it('登录读者：按帖子分别标记点赞与收藏', async () => {
    const items = await attachViewerFlags([{ id: 10 }, { id: 11 }], '1', executor)
    assert.deepEqual(items.map((item) => [item.id, item.isLiked, item.isBookmarked]), [
      [10, true, false],
      [11, false, true],
    ])
  })

  it('其他读者看到的是自己的状态，不受他人影响', async () => {
    const items = await attachViewerFlags([{ id: 10 }], '2', executor)
    assert.deepEqual(items.map((item) => [item.isLiked, item.isBookmarked]), [[false, false]])
  })

  it('空列表不触发查询', async () => {
    let called = false
    const spy: Executor = {
      query: (sql, params) => {
        called = true
        return executor.query(sql, params)
      },
    }
    assert.deepEqual(await attachViewerFlags([], '1', spy), [])
    assert.equal(called, false)
  })
})
