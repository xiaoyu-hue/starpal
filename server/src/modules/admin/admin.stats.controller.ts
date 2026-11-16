// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { ROLE_ADMIN } from '../../config/constants.js'
import { pool } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import { sendData } from '../../shared/response.js'
import type { Executor } from './admin.types.js'

/**
 * 基础统计：四个运营最关心的数字，纯 SQL 聚合，不引入图表库。
 * 口径与前台可见性对齐：帖子数只算已发布 / 未删除 / 话题未归档 / 作者未停用；
 * 用户数排除注销；评论数只算已发布未删除；待处理举报含 pending 与 reviewing（均未终结）。
 */

export type AdminStats = {
  userCount: number
  postCount: number
  commentCount: number
  pendingReportCount: number
}

export async function getAdminStats(executor: Executor = pool): Promise<AdminStats> {
  const result = await executor.query(
    `SELECT
      (SELECT count(*)::int FROM users WHERE status <> 'deleted') AS user_count,
      (SELECT count(*)::int
         FROM posts p
         JOIN topics t ON t.id = p.topic_id
         JOIN users u ON u.id = p.author_id
        WHERE p.status = 'published' AND p.deleted_at IS NULL
          AND t.deleted_at IS NULL AND u.status <> 'suspended') AS post_count,
      (SELECT count(*)::int FROM comments WHERE status = 'published' AND deleted_at IS NULL) AS comment_count,
      (SELECT count(*)::int FROM reports WHERE status IN ('pending', 'reviewing')) AS pending_report_count`,
    [],
  )
  const r = result.rows[0] as Record<string, unknown>
  return {
    userCount: Number(r.user_count),
    postCount: Number(r.post_count),
    commentCount: Number(r.comment_count),
    pendingReportCount: Number(r.pending_report_count),
  }
}

export async function adminStatsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const principal = req.principal
    if (!principal || principal.role !== ROLE_ADMIN) {
      // 理论不可达（Router 已统一挂载守卫）；保留兜底，保持错误包络一致。
      throw new DomainError('FORBIDDEN', '无权访问该资源')
    }
    sendData(res, await getAdminStats())
  } catch (error) {
    next(error)
  }
}
