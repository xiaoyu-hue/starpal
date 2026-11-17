// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet } from '../../lib/api-client'
import type { AvatarStyle } from '../../types/api'

/** 头像接口：风格清单从服务端读取（唯一真相源），URL 在前端按约定格式拼装。 */

/** 拉取可自托管的头像风格清单（含署名信息）。 */
export async function fetchAvatarStyles(): Promise<AvatarStyle[]> {
  const envelope = await apiGet<AvatarStyle[]>('meta/avatar-styles')
  return envelope.data
}

/** 拼出站内头像 URL；与服务端 requireAvatarUrl 接受的格式一致。 */
export function avatarImageUrl(slug: string, seed: string): string {
  return `/api/avatars/${encodeURIComponent(slug)}?seed=${encodeURIComponent(seed)}`
}

/** 从当前头像 URL 反解出风格与种子；外链（老用户）返回 null。 */
export function parseAvatarUrl(url: string | null): { slug: string; seed: string } | null {
  if (url === null || !url.startsWith('/api/avatars/')) return null
  const queryIndex = url.indexOf('?')
  const path = queryIndex === -1 ? url : url.slice(0, queryIndex)
  const slug = decodeURIComponent(path.slice('/api/avatars/'.length))
  const params = new URLSearchParams(queryIndex === -1 ? '' : url.slice(queryIndex + 1))
  const seed = params.get('seed')
  if (seed === null) return null
  return { slug, seed }
}

/** 生成一个简短的随机种子（仅用作头像输入，不含任何被禁字符）。 */
export function randomSeed(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

/** 前端种子校验：与服务端 AVATAR_SEED_PATTERN 保持同口径（体验提示，非安全边界）。 */
export function isValidSeed(seed: string): boolean {
  return seed.length > 0 && seed.length <= 64 && /^[\p{L}\p{N} _-]+$/u.test(seed)
}
