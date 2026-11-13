import type { NextFunction, Request, Response } from 'express'
import { APP_VERSION } from '../../config/constants.js'
import { pool } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import { sendData } from '../../shared/response.js'

/** 健康检查执行真实数据库查询；数据库不可用时返回统一错误包络。 */
export async function healthController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await pool.query<{ server_time: Date }>('SELECT now() AS server_time')
    const serverTime = result.rows[0]?.server_time ?? null
    sendData(res, {
      status: 'ok',
      database: 'up',
      version: APP_VERSION,
      serverTime: serverTime?.toISOString() ?? null,
    })
  } catch {
    next(new DomainError('INTERNAL_ERROR', '数据库健康检查未通过'))
  }
}
