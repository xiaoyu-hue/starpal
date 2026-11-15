// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Metrics } from '../../src/shared/metrics.js'
import {
  MAX_LEVEL,
  RANKS,
  computeExperience,
  levelOf,
  rankOf,
  thresholdOf,
} from '../../src/modules/levels/index.js'

/**
 * 等级规则 M5.5-S2：把「L50 到底要多少经验」「多少级算元老」钉死在测试里。
 *
 * 这里刻意**手抄**数字而不从 `LEVEL_THRESHOLDS` 反算期望值——
 * 拿实现算期望值的测试永远会通过，改坏公式它也照样绿。
 * 下面每个数字都是产品决定，变的时候必须同时改测试，这是有意设的门槛。
 */

const ZERO: Metrics = {
  posts_published: 0,
  comments_published: 0,
  topics_covered: 0,
  likes_received: 0,
  messages_sent: 0,
  invites_used: 0,
  days_since_join: 0,
}

function metrics(patch: Partial<Metrics>): Metrics {
  return { ...ZERO, ...patch }
}

describe('等级门槛', () => {
  it('L1 从 0 开始，三段增量分别为 20 / 40 / 60', () => {
    assert.equal(thresholdOf(1), 0)
    assert.equal(thresholdOf(2), 20)
    assert.equal(thresholdOf(10), 180, 'L2–L10 九次 ×20')
    assert.equal(thresholdOf(11), 220)
    assert.equal(thresholdOf(30), 980, 'L11–L30 二十次 ×40')
    assert.equal(thresholdOf(31), 1040)
    assert.equal(thresholdOf(MAX_LEVEL), 2180, 'L31–L50 二十次 ×60')
  })

  it('门槛随等级严格递增，没有一级是白送的', () => {
    let previous = -1
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const current = thresholdOf(level)
      assert.ok(current > previous, `L${level} 的门槛必须高于上一级`)
      previous = current
    }
  })

  it('越界等级收敛到边界，不抛错（页面宁可显示 L1 也不该崩）', () => {
    assert.equal(thresholdOf(0), 0)
    assert.equal(thresholdOf(-5), 0)
    assert.equal(thresholdOf(999), thresholdOf(MAX_LEVEL))
    // 小数来自任何一次浮点运算残留，按整数截断处理
    assert.equal(thresholdOf(10.9), thresholdOf(10))
  })
})

describe('经验换算等级', () => {
  it('刚好踩线与差一分是两级', () => {
    assert.equal(levelOf(0), 1)
    assert.equal(levelOf(19), 1)
    assert.equal(levelOf(20), 2)
    assert.equal(levelOf(179), 9)
    assert.equal(levelOf(180), 10)
    assert.equal(levelOf(219), 10)
    assert.equal(levelOf(220), 11)
    assert.equal(levelOf(979), 29)
    assert.equal(levelOf(980), 30)
    assert.equal(levelOf(2179), 49)
    assert.equal(levelOf(2180), 50)
  })

  it('超过上限不会溢出到 51 级', () => {
    assert.equal(levelOf(99999), MAX_LEVEL)
  })

  it('负数与非法值按 L1 处理', () => {
    assert.equal(levelOf(-100), 1)
    assert.equal(levelOf(Number.NaN), 1)
  })
})

describe('段位', () => {
  it('五段边界落在 10 / 20 / 30 / 40，首尾闭合', () => {
    assert.equal(rankOf(1).nameZh, '萌新')
    assert.equal(rankOf(10).nameZh, '萌新')
    assert.equal(rankOf(11).nameZh, '入门')
    assert.equal(rankOf(20).nameZh, '入门')
    assert.equal(rankOf(21).nameZh, '常客')
    assert.equal(rankOf(30).nameZh, '常客')
    assert.equal(rankOf(31).nameZh, '老友')
    assert.equal(rankOf(40).nameZh, '老友')
    assert.equal(rankOf(41).nameZh, '元老')
    assert.equal(rankOf(50).nameZh, '元老')
  })

  it('段位覆盖 1–50 全部等级，不留空洞', () => {
    const keys = new Set(RANKS.map((rank) => rank.key))
    assert.equal(keys.size, 5)
    assert.equal(RANKS[RANKS.length - 1]!.maxLevel, MAX_LEVEL)
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      assert.ok(rankOf(level), `L${level} 必须落在某个段位里`)
    }
  })
})

describe('经验计算', () => {
  it('零参与是零经验', () => {
    assert.equal(computeExperience(ZERO), 0)
  })

  it('各项权重按产品决定累加', () => {
    // 1 帖 = 10；1 评论 = 3；1 话题 = 15；1 赞 = 2；1 天 = 1；私信 0 分
    assert.equal(computeExperience(metrics({ posts_published: 1 })), 10)
    assert.equal(
      computeExperience(
        metrics({
          posts_published: 1,
          comments_published: 1,
          topics_covered: 1,
          likes_received: 1,
          days_since_join: 1,
        }),
      ),
      31,
    )
  })

  it('私信不换经验——私人交流不该成为刷等级的通道', () => {
    assert.equal(computeExperience(metrics({ messages_sent: 500 })), 0)
  })

  it('话题最多算 5 个，防止「每帖换个话题」刷分', () => {
    assert.equal(computeExperience(metrics({ topics_covered: 5 })), 75)
    assert.equal(computeExperience(metrics({ topics_covered: 50 })), 75)
  })

  it('加入天数封顶 100 天，防止「注册早」白拿等级', () => {
    assert.equal(computeExperience(metrics({ days_since_join: 100 })), 100)
    assert.equal(computeExperience(metrics({ days_since_join: 3650 })), 100)
    // 只有天数、没有任何参与的十年老号，也到不了 L6
    assert.equal(levelOf(computeExperience(metrics({ days_since_join: 3650 }))), 6)
  })

  it('结果是整数且非负', () => {
    const value = computeExperience(metrics({ posts_published: 3, comments_published: 7 }))
    assert.equal(Number.isInteger(value), true)
    assert.ok(value >= 0)
  })

  it('真实样本落档符合预期（用于人工校准曲线）', () => {
    // 轻度：3 帖 + 5 评论 + 1 话题 + 5 赞 + 30 天 = 30 + 15 + 15 + 10 + 30 = 100
    const light = computeExperience(
      metrics({
        posts_published: 3,
        comments_published: 5,
        topics_covered: 1,
        likes_received: 5,
        days_since_join: 30,
      }),
    )
    assert.equal(light, 100)
    assert.equal(levelOf(light), 6)

    // 活跃：10 帖 + 30 评论 + 3 话题 + 40 赞 + 2 邀请 + 60 天 = 415
    const active = computeExperience(
      metrics({
        posts_published: 10,
        comments_published: 30,
        topics_covered: 3,
        likes_received: 40,
        invites_used: 2,
        days_since_join: 60,
      }),
    )
    assert.equal(active, 415)
    assert.equal(levelOf(active), 15)
    assert.equal(rankOf(levelOf(active)).nameZh, '入门')
  })
})
