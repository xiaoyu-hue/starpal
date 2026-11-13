import type { Request, Response } from 'express'
import { GUIDELINES } from '../../config/constants.js'
import { sendData } from '../../shared/response.js'

/** 社区准则与版本信息：只读常量，不依赖数据库。 */
export function metaController(_req: Request, res: Response): void {
  sendData(res, GUIDELINES)
}
