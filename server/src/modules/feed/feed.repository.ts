import { pool } from '../../db/pool.js'

export type FeedItem = {
  id: number
  title: string
  excerpt: string
  topic: { slug: string; nameZh: string }
  author: { username: string; avatarUrl: string | null }
  likeCount: number
  commentCount: number
  images: string[]
  createdAt: string
}

export type FeedPage = {
  items: FeedItem[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * M1 阶段：posts / topics 表属于迁移 003（M3），当前不存在。
 * 端点执行真实数据库查询判断表是否就绪；未就绪时返回真实空页，
 * 由前端呈现引导式空态，不填充演示数据、不伪造计数。
 * M3 建表后，在此函数内按 tab 接入确定性排序查询（见 PRD §4.2）。
 */
export async function listPosts(): Promise<FeedPage> {
  const result = await pool.query<{ ready: boolean }>(
    "SELECT to_regclass('public.posts') IS NOT NULL AS ready",
  )
  if (result.rows[0]?.ready !== true) {
    return { items: [], nextCursor: null, hasMore: false }
  }
  // 迁移 003 生效后由 M3 替换为带可见性条件与游标键集的真实查询。
  return { items: [], nextCursor: null, hasMore: false }
}
