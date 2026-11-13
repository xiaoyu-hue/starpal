import type { Request } from 'express'

/** 请求上下文：由 request-id 中间件挂载，贯穿日志与错误响应。 */
export type RequestContext = {
  requestId: string
  startedAt: number
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      context: RequestContext
    }
  }
}

export function requestIdOf(req: Request): string {
  return req.context?.requestId ?? 'req_unknown'
}
