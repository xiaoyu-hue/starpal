import { DomainError } from '../../shared/errors.js'
import {
  generateInviteCodes,
  listInviteCodes,
  revokeInviteCode,
  type InviteCodeRow,
} from './invite.repository.js'

export type { InviteCodeRow } from './invite.repository.js'

/** 单次生成上限：防误填大数刷出一堆码；运营者按需多次生成即可。 */
export const INVITE_GENERATE_MAX = 50

export async function generateCodes(
  count: number,
  createdBy: string,
  note?: string,
): Promise<string[]> {
  const safeCount = Math.min(Math.max(1, Number.isInteger(count) ? count : 1), INVITE_GENERATE_MAX)
  return generateInviteCodes(safeCount, createdBy, note)
}

export async function listCodes(): Promise<InviteCodeRow[]> {
  return listInviteCodes()
}

/** 撤销：不可撤销（不存在 / 已用 / 已撤）时按 NOT_FOUND 处理，让前端区分状态。 */
export async function revokeCode(id: number): Promise<void> {
  const affected = await revokeInviteCode(id)
  if (affected === 0) throw new DomainError('NOT_FOUND', '邀请码不存在或已不可撤销')
}
