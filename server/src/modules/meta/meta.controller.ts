import type { Request, Response } from 'express'
import { ABOUT, ANNOUNCEMENTS, GUIDELINES, PRIVACY, TERMS } from '../../config/constants.js'
import { sendData } from '../../shared/response.js'

/** 社区准则：只读常量，不依赖数据库。长文正文在 config/docs 下。 */
export function metaController(_req: Request, res: Response): void {
  sendData(res, GUIDELINES)
}

/** 社区公告：与右栏卡片、/announcements 页共用同一份常量。 */
export function announcementsController(_req: Request, res: Response): void {
  sendData(res, ANNOUNCEMENTS)
}

/** 隐私说明：每一条都与当前后端行为对应，未实现的能力标注为缺口。 */
export function privacyController(_req: Request, res: Response): void {
  sendData(res, PRIVACY)
}

/** 关于页：站点自述、技术构成、致谢与反馈渠道，随代码版本化。 */
export function aboutController(_req: Request, res: Response): void {
  sendData(res, ABOUT)
}

/** 用户协议：注册时勾选同意的就是这一份。 */
export function termsController(_req: Request, res: Response): void {
  sendData(res, TERMS)
}
