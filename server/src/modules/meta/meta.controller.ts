import type { Request, Response } from 'express'
import {
  ANNOUNCEMENTS,
  APP_VERSION,
  GUIDELINES,
  PRIVACY,
  SITE_LAUNCH_DATE,
  SITE_NAME,
} from '../../config/constants.js'
import { sendData } from '../../shared/response.js'

/** 社区准则与版本信息：只读常量，不依赖数据库。 */
export function metaController(_req: Request, res: Response): void {
  sendData(res, GUIDELINES)
}

/** 社区公告：与右栏卡片、/announcements 页共用同一份常量。 */
export function announcementsController(_req: Request, res: Response): void {
  sendData(res, ANNOUNCEMENTS)
}

/** 隐私说明：分节文案，与 M2-S4 真实实现一致。 */
export function privacyController(_req: Request, res: Response): void {
  sendData(res, PRIVACY)
}

/** 关于页：站点名称、当前版本与建站日期，供前端展示并随代码版本化。 */
export function aboutController(_req: Request, res: Response): void {
  sendData(res, {
    siteName: SITE_NAME,
    version: APP_VERSION,
    launchDate: SITE_LAUNCH_DATE,
  })
}
