// SPDX-License-Identifier: AGPL-3.0-or-later
import { DELETED_DISPLAY_NAME } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { attachViewerFlags } from '../interactions/index.js'
import { toListItem, type PostListItem, type RowExecutor } from '../posts/index.js'
import {
  describeCondition,
  isSatisfied,
  parseCondition,
  type Metrics,
} from './achievement.engine.js'
import {
  collectMetrics,
  findUserRef,
  insertUnlocked,
  listDefinitions,
  listUnlocked,
  listWeeklyPopular,
  getWeekRange,
  type AchievementRow,
  type MetricsRow,
} from './achievement.repository.js'

/** 单次展示的本周热门条数：与「发现页精选」同量级，一屏可见，不做无限加载。 */
export const WEEKLY_LIMIT = 5

/** 对外：一条成就（已解锁带解锁时间，未解锁为 null）。 */
export type AchievementItem = {
  code: string
  nameZh: string
  description: string
  /** 达成条件的人话描述，由服务端统一生成，前端不复制文案。 */
  goal: string
  unlockedAt: string | null
}

/** 对外：某用户的成就时间线。已解锁在前（按解锁时间倒序），未解锁在后（按展示顺序）。 */
export type TimelineView = {
  username: string
  displayName: string
  unlockedCount: number
  totalCount: number
  items: AchievementItem[]
}

export type WeeklyView = {
  range: { start: string; end: string }
  items: PostListItem[]
}

export type WeeklyViewer = { id: string; role: string } | null

function toMetrics(row: MetricsRow): Metrics {
  return {
    posts_published: row.posts_published,
    comments_published: row.comments_published,
    topics_covered: row.topics_covered,
    likes_received: row.likes_received,
    messages_sent: row.messages_sent,
    invites_used: row.invites_used,
    days_since_join: row.days_since_join,
  }
}

function toItem(row: AchievementRow, unlockedAt: Date | undefined): AchievementItem {
  const condition = parseCondition(row.condition)
  return {
    code: row.code,
    nameZh: row.name_zh,
    description: row.description,
    // 数据写坏时给一句可读的降级文案，而不是让整页 500；库里已有 CHECK 兜住结构。
    goal: condition ? describeCondition(condition) : '条件暂不可用',
    unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
  }
}

/**
 * 读取某用户的成就时间线，并顺手补写新达标的解锁记录。
 *
 * **这里有一次读操作的写副作用，是有意为之**：解锁判定采用「读时判定」，
 * 打开成就页或资料页时现算指标、把新达标的写进 user_achievements。
 * 换来的是完全不动已上线的发帖 / 评论 / 点赞 / 私信写路径（零回归风险），
 * 且天然不会漏挂入口。代价是 `unlockedAt` 记录的是「判定时刻」而非真实达成时刻，
 * 页面文案如实写作「解锁于某日」，不谎称精确到秒的达成时间。
 *
 * 写入用 ON CONFLICT DO NOTHING，同一秒内被调用多次也只会新增一次记录。
 * 已注销用户不判定也不展示（徽章属个人化信息，注销后不再对外保留）。
 */
export async function getTimeline(
  username: string,
  executor?: RowExecutor,
): Promise<TimelineView> {
  const user = await findUserRef(username, executor)
  // 停用账户按不存在处理，与公开资料页口径一致（不泄露"此号存在但被封"）。
  if (!user || user.status === 'suspended') {
    throw new DomainError('NOT_FOUND', '用户不存在')
  }

  const defs = await listDefinitions(executor)

  if (user.status === 'deleted') {
    return {
      username: user.display_name,
      displayName: DELETED_DISPLAY_NAME,
      unlockedCount: 0,
      totalCount: defs.length,
      items: [],
    }
  }

  const metricsRow = await collectMetrics(user.id, executor)
  const metrics = metricsRow ? toMetrics(metricsRow) : null

  const unlockedAt = new Map<string, Date>()
  for (const row of await listUnlocked(user.id, executor)) {
    unlockedAt.set(row.achievement_code, row.unlocked_at)
  }

  if (metrics) {
    const missing = defs
      .filter((def) => !unlockedAt.has(def.code))
      .filter((def) => {
        const condition = parseCondition(def.condition)
        return condition !== null && isSatisfied(condition, metrics)
      })
      .map((def) => def.code)

    for (const row of await insertUnlocked(user.id, missing, executor)) {
      unlockedAt.set(row.achievement_code, row.unlocked_at)
    }
  }

  const items = defs.map((def) => toItem(def, unlockedAt.get(def.code)))
  const unlocked = items
    .filter((item) => item.unlockedAt !== null)
    .sort((a, b) => (b.unlockedAt as string).localeCompare(a.unlockedAt as string))
  const locked = items.filter((item) => item.unlockedAt === null)

  return {
    username,
    displayName: user.display_name,
    unlockedCount: unlocked.length,
    totalCount: items.length,
    items: [...unlocked, ...locked],
  }
}

/**
 * 本周热门帖子（只读聚合，不落表、不跑定时任务）。
 * 只排帖子不排人——按用户排名就是排行榜，PRD `FR-ACH-04` 明确禁止。
 */
export async function getWeekly(
  viewer: WeeklyViewer = null,
  executor?: RowExecutor,
): Promise<WeeklyView> {
  const rows = await listWeeklyPopular(WEEKLY_LIMIT, executor)
  const range = await getWeekRange(executor)
  const items = await attachViewerFlags(rows.map(toListItem), viewer?.id ?? null, executor)
  return { range, items }
}
