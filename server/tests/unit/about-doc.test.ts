// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ABOUT } from '../../src/config/constants.js'
import { ANNOUNCEMENT_ITEMS } from '../../src/config/docs/announcements.doc.js'

/**
 * 关于页正文的合规与一致性不变量。
 * 把四条最容易漂移的口径钉在测试里：
 * ① 分离式许可三类必须写全；② 源码获取途径必须存在；
 * ③ 未完成能力清单必须与公告 status 条（面向用户的唯一真源）一致；
 * ④ 已交付能力不得再被写成未完成（收藏列表即最新一例）。
 */

/** 当前对社区用户公示的未完成能力，公告 status 条与关于页自述必须逐条一致。 */
const PENDING_GAPS = ['私信', '搜索', '举报与申诉入口'] as const

describe('关于页许可与源码信息', () => {
  it('三类许可齐全，且各自写明适用对象与范围', () => {
    const licenses = ABOUT.licensing.items.map((item) => item.license)
    assert.deepEqual(licenses, ['AGPL-3.0-or-later', 'CC BY-NC-SA 4.0', '商标保留'])
    for (const item of ABOUT.licensing.items) {
      assert.ok(item.label.length > 0, `${item.license} 缺少适用对象`)
      assert.ok(item.note.length > 0, `${item.license} 缺少范围说明`)
    }
  })

  it('源码获取途径存在：https 仓库地址 + 索取兜底说明', () => {
    assert.match(ABOUT.licensing.sourceUrl, /^https:\/\/github\.com\//)
    assert.match(ABOUT.licensing.sourceNote, /完整源码/)
    assert.match(ABOUT.licensing.sourceNote, /暂不可访问/)
  })

  it('许可文案不写死仓库公开状态，公开前后都不必改代码', () => {
    const all = JSON.stringify(ABOUT.licensing)
    assert.doesNotMatch(all, /已公开|尚未公开|私有仓库/)
  })
})

describe('关于页未完成清单与公告真源一致', () => {
  it('公告 status 条与关于页自述列出同样的未完成能力', () => {
    const status = ANNOUNCEMENT_ITEMS.find((item) => item.kind === 'status')
    assert.ok(status, '公告真源应含 status 条')
    const intro = ABOUT.intro.join('')
    const changes = status.changes.join('')
    for (const gap of PENDING_GAPS) {
      assert.ok(intro.includes(gap), `关于页自述缺少未完成项：${gap}`)
      assert.ok(changes.includes(gap), `公告 status 缺少未完成项：${gap}`)
    }
  })

  it('收藏列表已交付：不再列为未完成，且写进已交付能力', () => {
    const status = ANNOUNCEMENT_ITEMS.find((item) => item.kind === 'status')!
    const intro = ABOUT.intro.join('')
    assert.ok(!intro.includes('收藏列表界面'), '关于页仍把收藏列表界面列为未完成')
    // 公告其它明细会写「已交付」的说明，故只校验「未完成：」那一行，避免把交付说明误判成缺口。
    const pendingLine = status.changes.find((line) => line.startsWith('未完成：')) ?? ''
    assert.ok(pendingLine.length > 0, '公告 status 缺少未完成清单行')
    assert.ok(!pendingLine.includes('收藏列表'), '公告 status 的未完成清单仍含收藏列表')
    assert.match(intro, /我的收藏列表.*已经可用/)
  })

  it('不再把已交付能力写成未完成', () => {
    const intro = ABOUT.intro.join('')
    for (const stale of ['通知中心仍在路上', '没有自助改密', '帖子暂时不能自己删除']) {
      assert.ok(!intro.includes(stale), `关于页仍残留过时表述：${stale}`)
    }
  })
})
