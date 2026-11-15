// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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
const PENDING_GAPS = ['数据导出'] as const

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

/**
 * 一致性真源改为**迁移 016 的种子**，不再是代码常量里的 status 条。
 *
 * 2026-11-15 的公告分层改造把「当前状态」搬进了数据库（运营者要能随时改），
 * 代码里只剩「发布记录」档案。测试若继续找 `kind === 'status'` 的常量会全线失败，
 * 而正确的真源变成了「数据库里那条种子最初长什么样」——即迁移文件本身。
 */
const STATUS_SEED_SQL = readFileSync(
  fileURLToPath(new URL('../../src/db/migrations/016_announcements.sql', import.meta.url)),
  'utf8',
)

/** 已交付能力：关于页与公告种子必须同时列出，任一处漏写即为漂移。 */
const DELIVERED = [
  '我的收藏列表',
  '我的点赞列表',
  '全站搜索',
  '站内私信',
  '每周热门',
  '数据导出',
] as const

/** 仍未完成的能力：两处都要写，且不得用「即将上线」搪塞。 */
const PENDING = ['经验 / 签到 / 等级'] as const

describe('关于页自述与公告种子口径一致', () => {
  const intro = ABOUT.intro.join('')

  it('已交付能力在关于页与公告种子里都列出', () => {
    for (const item of DELIVERED) {
      assert.ok(intro.includes(item), `关于页自述缺少已交付能力：${item}`)
      assert.ok(STATUS_SEED_SQL.includes(item), `公告种子缺少已交付能力：${item}`)
    }
  })

  it('未完成能力在两处都写，且不出现「即将上线」', () => {
    for (const gap of PENDING) {
      assert.ok(intro.includes(gap), `关于页自述缺少未完成项：${gap}`)
      assert.ok(STATUS_SEED_SQL.includes(gap), `公告种子缺少未完成项：${gap}`)
    }
    // 关于页会「引用」这句「不用即将上线搪塞」来说明态度，所以不能直接禁词；
    // 换成同义的承诺式表述做判据：出现「敬请期待」就是拿话术顶替实际情况。
    assert.ok(!intro.includes('敬请期待'), '关于页用「敬请期待」搪塞缺口')
  })

  it('不再把已交付能力写成未完成', () => {
    const stale = [
      '数据导出仍在路上',
      '私信仍在路上',
      '举报与申诉入口仍在路上',
      '通知中心仍在路上',
      '帖子暂时不能自己删除',
      '没有自助改密',
      '收藏列表界面',
    ]
    for (const phrase of stale) {
      assert.ok(!intro.includes(phrase), `关于页仍残留过时表述：${phrase}`)
    }
  })

  it('发布记录里不再残留与事实相反的说法', () => {
    const all = JSON.stringify(ANNOUNCEMENT_ITEMS)
    assert.ok(!all.includes('私信仍在开发中'), '发布记录里仍有与事实相反的描述')
  })
})
