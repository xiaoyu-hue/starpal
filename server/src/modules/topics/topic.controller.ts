import type { NextFunction, Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { listTopics } from './topic.service.js'

/** 话题控制器：只做「调用服务 → 统一包络」，无参数可解析。 */
export async function topicListController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendData(res, await listTopics())
  } catch (error) {
    next(error)
  }
}
