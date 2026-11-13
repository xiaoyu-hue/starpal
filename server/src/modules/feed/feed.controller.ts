import type { NextFunction, Request, Response } from 'express'
import { FEED_MAX_PAGE_SIZE, FEED_PAGE_SIZE, FEED_TABS, type FeedTab } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { decodeCursor } from '../../shared/pagination.js'
import { sendData } from '../../shared/response.js'
import { listPosts } from './feed.repository.js'

function parseTab(raw: unknown): FeedTab {
  const value = typeof raw === 'string' ? raw : ''
  if (!FEED_TABS.includes(value as FeedTab)) {
    throw new DomainError('VALIDATION_FAILED', 'tab 参数必须是 recommended / latest / popular', [
      { field: 'tab', constraint: `enum: ${FEED_TABS.join(' | ')}` },
    ])
  }
  return value as FeedTab
}

function parseLimit(raw: unknown): number {
  if (raw === undefined) return FEED_PAGE_SIZE
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > FEED_MAX_PAGE_SIZE) {
    throw new DomainError('VALIDATION_FAILED', 'limit 参数超出允许范围', [
      { field: 'limit', constraint: `1..${FEED_MAX_PAGE_SIZE}` },
    ])
  }
  return value
}

/** 信息流列表：参数在服务端校验，返回统一响应包络与分页 meta。 */
export async function feedController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    parseTab(req.query.tab)
    parseLimit(req.query.limit)
    if (req.query.cursor !== undefined) {
      const value = typeof req.query.cursor === 'string' ? req.query.cursor : ''
      if (value !== '' && decodeCursor(value) === null) {
        throw new DomainError('VALIDATION_FAILED', 'cursor 参数格式非法', [
          { field: 'cursor', constraint: 'base64url 编码的游标' },
        ])
      }
    }
    const page = await listPosts()
    sendData(res, page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    next(error)
  }
}
