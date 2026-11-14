// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet, apiPost } from '../../lib/api-client'
import type { LoginPayload, PublicUser, RegisterPayload } from '../../types/api'

/** 认证接口：只描述路径与载荷，传输与错误归一化由 api-client 统一承担。 */
type MeData = { user: PublicUser }
type LoginData = { user: PublicUser }
type RegisterData = { registered: boolean; user: PublicUser }
type LogoutData = { loggedOut: boolean }

/** 当前会话：未登录时传输层抛 401 AUTH_REQUIRED。 */
export async function fetchMe(): Promise<PublicUser> {
  const envelope = await apiGet<MeData>('auth/me')
  return envelope.data.user
}

export async function loginUser(payload: LoginPayload): Promise<PublicUser> {
  const envelope = await apiPost<LoginData>('auth/login', payload)
  return envelope.data.user
}

export async function registerUser(payload: RegisterPayload): Promise<PublicUser> {
  const envelope = await apiPost<RegisterData>('auth/register', payload)
  return envelope.data.user
}

export async function logoutUser(): Promise<void> {
  await apiPost<LogoutData>('auth/logout')
}
