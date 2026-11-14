import { apiGet, apiPost } from '../../lib/api-client'
import type { GenerateInviteResult, InviteCodeList } from '../../types/api'

/** 邀请码管理接口：与后端 /api/admin/invite-codes 对应，须 admin 权限。 */

/** 列表：全部邀请码及其状态，按创建时间倒序。 */
export async function fetchInviteCodes(): Promise<InviteCodeList> {
  const envelope = await apiGet<InviteCodeList>('admin/invite-codes')
  return envelope.data
}

/** 生成：返回一次性明文码，库内只存哈希。 */
export async function generateInviteCodes(count: number, note?: string): Promise<GenerateInviteResult> {
  const envelope = await apiPost<GenerateInviteResult>('admin/invite-codes', { count, note })
  return envelope.data
}

/** 撤销：仅 available 可撤销，已用 / 已撤返回 NOT_FOUND。 */
export async function revokeInviteCode(id: number): Promise<void> {
  await apiPost(`admin/invite-codes/${id}/revoke`)
}
