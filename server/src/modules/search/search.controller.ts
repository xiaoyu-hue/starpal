// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import type { AuthPrincipal } from '../../shared/types.js'
import { parseSearchQuery } from './search.schema.js'
import { search, type SearchViewer } from './search.service.js'

/** 搜索控制器：参数解析 → 服务层 → 统一分页包络。 */

function viewerOf(principal: AuthPrincipal | undefined): SearchViewer {
  return principal ? { id: principal.id, role: principal.role } : null
}

export async function searchController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = parseSearchQuery(req.query as Record<string, unknown>)
    const page = await search(query, viewerOf(req.principal))
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}
