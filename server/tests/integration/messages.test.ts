// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb, seedUser } from '../helpers/db.js'
import { decodeCursor } from '../../src/shared/pagination.js'
import type { Executor } from '../../src/modules/messages/messages.repository.js'
import {
  createConversation,
  getConversationFor,
  listConversationsFor,
  listMessagesFor,
  sendMessageIn,
} from '../../src/modules/messages/messages.service.js'

function codeIs(code: string) {
  return (error: unknown): boolean =>
    typeof error === 'object' && error !== null && (error as { code?: string }).code === code
}

function executorOf(db: PGlite): Executor {
  return { query: (sql: string, params: unknown[]) => db.query(sql, params) }
}

/** 测试直连 service，游标需自行解码（HTTP 层由 controller 负责解码）。 */
function cursorOf(encoded: string | null): { t: string; id: string } | null {
  if (!encoded) return null
  const decoded = decodeCursor(encoded)
  assert.ok(decoded, '游标应可解码')
  return decoded
}

test('M5-S1 私信：创建会话幂等（两人恒唯一）', async () => {
  const db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  await seedUser(db, 2, 'bob')
  const ex = executorOf(db)
  const first = await createConversation('1', 'bob', ex)
  const second = await createConversation('1', 'bob', ex)
  assert.equal(first.id, second.id, '重复创建应返回同一会话')
  assert.equal(first.other.username, 'bob')
  // 反向发起同样复用同一会话（LEAST/GREATEST 归一化）。
  const reverse = await createConversation('2', 'alice', ex)
  assert.equal(reverse.id, first.id, '对方反向发起应复用同一会话')
})

test('M5-S1 私信：不能与自己发起', async () => {
  const db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  const ex = executorOf(db)
  await assert.rejects(() => createConversation('1', 'alice', ex), codeIs('FORBIDDEN'))
})

test('M5-S1 私信：收件人不存在被拒', async () => {
  const db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  const ex = executorOf(db)
  await assert.rejects(() => createConversation('1', 'ghost', ex), codeIs('VALIDATION_FAILED'))
})

test('M5-S1 私信：发送、对方列会话可见最近消息、游标分页', async () => {
  const db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  await seedUser(db, 2, 'bob')
  const ex = executorOf(db)
  const conv = await createConversation('1', 'bob', ex)

  await sendMessageIn('1', conv.id, '第一条', ex)
  await sendMessageIn('1', conv.id, '第二条', ex)
  await sendMessageIn('1', conv.id, '第三条', ex)

  // 对方（bob）列会话，应看到最近消息预览为「第三条」。
  const list = await listConversationsFor('2', null, 20, ex)
  assert.equal(list.items.length, 1)
  const cv = list.items[0]!
  assert.equal(cv.other.username, 'alice')
  assert.equal(cv.lastMessage?.body, '第三条')
  assert.equal(cv.lastMessage?.senderId, '1')

  // 消息列表：倒序 + 键集游标分页（limit=2）。
  const page1 = await listMessagesFor('1', conv.id, null, 2, ex)
  assert.equal(page1.items.length, 2, 'limit=2 取回 2 条')
  assert.equal(page1.hasMore, true)
  assert.equal(page1.items[0]!.body, '第三条')
  assert.equal(page1.items[1]!.body, '第二条')

  const page2 = await listMessagesFor('1', conv.id, cursorOf(page1.nextCursor), 2, ex)
  assert.equal(page2.items.length, 1, '第二页只余 1 条')
  assert.equal(page2.items[0]!.body, '第一条')
  assert.equal(page2.hasMore, false)
  assert.equal(page2.nextCursor, null)
})

test('M5-S1 私信：非参与者不能读取会话与消息', async () => {
  const db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  await seedUser(db, 2, 'bob')
  await seedUser(db, 3, 'carol')
  const ex = executorOf(db)
  const conv = await createConversation('1', 'bob', ex)
  await sendMessageIn('1', conv.id, '私密内容', ex)

  await assert.rejects(() => getConversationFor('3', conv.id, ex), codeIs('FORBIDDEN'))
  await assert.rejects(() => listMessagesFor('3', conv.id, null, 20, ex), codeIs('FORBIDDEN'))
  await assert.rejects(() => sendMessageIn('3', conv.id, '插话', ex), codeIs('FORBIDDEN'))

  // 参与者一方能正常读取。
  const mine = await listMessagesFor('2', conv.id, null, 20, ex)
  assert.equal(mine.items.length, 1)
  assert.equal(mine.items[0]!.body, '私密内容')
})

test('M5-S1 私信：空消息与超长消息在服务层被拒', async () => {
  const db = await createMigratedDb()
  await seedUser(db, 1, 'alice')
  await seedUser(db, 2, 'bob')
  const ex = executorOf(db)
  const conv = await createConversation('1', 'bob', ex)
  await assert.rejects(() => sendMessageIn('1', conv.id, '   ', ex), codeIs('VALIDATION_FAILED'))
  await assert.rejects(() => sendMessageIn('1', conv.id, 'x'.repeat(2001), ex), codeIs('VALIDATION_FAILED'))
  // 首尾空白归一后入库。
  const sent = await sendMessageIn('1', conv.id, '  你好  ', ex)
  assert.equal(sent.body, '你好')
})
