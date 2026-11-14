// SPDX-License-Identifier: AGPL-3.0-or-later
import { DomainError } from '../../shared/errors.js'
import { decodeCursor } from '../../shared/pagination.js'
import {
  requireBoolean,
  requireEnum,
  requireHttpUrl,
  requireObject,
  requireString,
} from '../../shared/validation.js'
import {
  AGE_BAND_VALUES,
  AVATAR_URL_MAX,
  BIOGRAPHY_MAX,
  DELETED_DISPLAY_NAME,
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  MBTI_VALUES,
  ROLE_ADMIN,
  TITLE_IDS,
  ZODIAC_VALUES,
  type TitleId,
} from '../../config/constants.js'
import { countPostsOf, listBookmarkedPosts, listLikedPosts, listUserPosts } from '../posts/index.js'
import {
  eraseUser,
  findOwnProfileById,
  findPublicProfileByUsername,
  softDeleteUser,
  type ProfileUpdateInput,
  updateProfile,
  updateTitles,
  type Executor,
} from './user.repository.js'
import type { OwnProfile, PublicProfile, UserPostsPage } from './user.types.js'

/** 个人资料业务层：公开投影、本人编辑、软删除与擦除。权限以 principal 为准。 */

/**
 * 公开投影：不返回密码哈希、角色、会话、网络地址等任何内部字段。
 * 已注销账户返回去标识化的「已注销用户」投影；被停用账户按不存在处理。
 */
export async function getPublicProfile(
  username: string,
  executor?: Executor,
): Promise<PublicProfile> {
  const row = await findPublicProfileByUsername(username, executor)
  if (!row) throw new DomainError('NOT_FOUND', '用户不存在')
  const isDeleted = row.status === 'deleted'
  const showOptional = row.show_optional && !isDeleted
  return {
    username: row.username,
    displayName: isDeleted ? DELETED_DISPLAY_NAME : row.display_name,
    avatarUrl: isDeleted ? null : row.avatar_url,
    biography: isDeleted ? null : row.biography,
    createdAt: row.created_at.toISOString(),
    postCount: await countPostsOf(row.id),
    titles: isDeleted ? [] : row.titles,
    optional: showOptional
      ? { zodiac: row.zodiac, mbti: row.mbti, ageBand: row.age_band }
      : null,
  }
}


/** 本人视角资料读取（含可选字段真实值与 showOptional 开关）。 */
export async function getOwnProfile(
  userId: string,
  executor?: Executor,
): Promise<OwnProfile> {
  const row = await findOwnProfileById(userId, executor)
  if (!row) throw new DomainError('NOT_FOUND', '用户不存在')
  return {
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    biography: row.biography,
    createdAt: row.created_at.toISOString(),
    postCount: await countPostsOf(row.id, executor),
    titles: row.titles,
    showOptional: row.show_optional,
    zodiac: row.zodiac,
    mbti: row.mbti,
    ageBand: row.age_band,
  }
}

/**
 * 公开个人页帖子：仅已发布内容，与信息流同一可见性口径。
 * 游标由本层解码：非法游标按参数错误拒绝，而不是静默退回第一页
 * （静默退回会让无限滚动陷入重复取首屏的死循环）。
 */
export async function getPublicPosts(
  username: string,
  rawCursor?: unknown,
  viewerId: string | null = null,
): Promise<UserPostsPage> {
  const row = await findPublicProfileByUsername(username)
  if (!row) throw new DomainError('NOT_FOUND', '用户不存在')
  const cursor = parseCursor(rawCursor)
  return listUserPosts(row.id, cursor, undefined, viewerId)
}

function parseCursor(raw: unknown): { t: string; id: string } | null {
  if (raw === undefined || raw === '') return null
  if (typeof raw !== 'string') {
    throw new DomainError('VALIDATION_FAILED', 'cursor 参数格式非法', [
      { field: 'cursor', constraint: 'base64url 编码的游标' },
    ])
  }
  const decoded = decodeCursor(raw)
  if (decoded === null) {
    throw new DomainError('VALIDATION_FAILED', 'cursor 参数格式非法', [
      { field: 'cursor', constraint: 'base64url 编码的游标' },
    ])
  }
  return decoded
}

/**
 * 资料编辑：仅处理调用方实际提供的字段（支持逐项清空），逐项校验。
 * 显示名落在 users 表，展示字段落在 user_profiles 表，事务内完成。
 */
export async function updateOwnProfile(
  userId: string,
  raw: unknown,
  executor?: Executor,
): Promise<OwnProfile> {
  const body = requireObject(raw)
  const input: ProfileUpdateInput = {}

  if ('displayName' in body) {
    input.displayName = requireString(body.displayName, {
      field: 'displayName',
      min: DISPLAY_NAME_MIN,
      max: DISPLAY_NAME_MAX,
      trim: true,
      allowInnerWhitespace: true,
    })
  }
  if ('avatarUrl' in body) {
    input.avatarUrl =
      body.avatarUrl === null ? null : requireHttpUrl(body.avatarUrl, 'avatarUrl', AVATAR_URL_MAX)
  }
  if ('biography' in body) {
    input.biography =
      body.biography === null
        ? null
        : requireString(body.biography, {
            field: 'biography',
            min: 0,
            max: BIOGRAPHY_MAX,
            trim: true,
            allowInnerWhitespace: true,
          })
  }
  if ('zodiac' in body) {
    input.zodiac = body.zodiac === null ? null : requireEnum(body.zodiac, 'zodiac', ZODIAC_VALUES)
  }
  if ('mbti' in body) {
    input.mbti = body.mbti === null ? null : requireEnum(body.mbti, 'mbti', MBTI_VALUES)
  }
  if ('ageBand' in body) {
    input.ageBand = body.ageBand === null ? null : requireEnum(body.ageBand, 'ageBand', AGE_BAND_VALUES)
  }
  if ('showOptional' in body) {
    input.showOptional = requireBoolean(body.showOptional, 'showOptional')
  }

  const row = await updateProfile(userId, input)
  return {
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    biography: row.biography,
    createdAt: row.created_at.toISOString(),
    postCount: await countPostsOf(row.id, executor),
    titles: row.titles,
    showOptional: row.show_optional,
    zodiac: row.zodiac,
    mbti: row.mbti,
    ageBand: row.age_band,
  }
}

/**
 * 头衔更新（M5.5-S1）：仅管理员可对自己的账号设置 / 清除头衔，其他人只读。
 * 取值须在预设目录内（012 迁移 CHECK 约束二次兜底），重复或顺序无关。
 */
export async function updateOwnTitles(
  userId: string,
  role: string,
  raw: unknown,
  executor?: Executor,
): Promise<OwnProfile> {
  if (role !== ROLE_ADMIN) {
    throw new DomainError('FORBIDDEN', '只有管理员可以设置头衔')
  }
  const body = requireObject(raw)
  if (!('titles' in body)) {
    throw new DomainError('VALIDATION_FAILED', '请求体缺少 titles 字段', [
      { field: 'titles', constraint: '必须为头衔 id 数组' },
    ])
  }
  const rawTitles = body.titles
  if (!Array.isArray(rawTitles)) {
    throw new DomainError('VALIDATION_FAILED', 'titles 必须为数组', [
      { field: 'titles', constraint: `取值须为 ${TITLE_IDS.join(' | ')} 的数组` },
    ])
  }
  const seen = new Set<TitleId>()
  const titles: TitleId[] = []
  for (const item of rawTitles) {
    const value = requireEnum(item, 'titles[]', TITLE_IDS)
    if (!seen.has(value)) {
      seen.add(value)
      titles.push(value)
    }
  }

  const row = await updateTitles(userId, titles, executor)
  return {
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    biography: row.biography,
    createdAt: row.created_at.toISOString(),
    postCount: await countPostsOf(row.id, executor),
    titles: row.titles,
    showOptional: row.show_optional,
    zodiac: row.zodiac,
    mbti: row.mbti,
    ageBand: row.age_band,
  }
}

/** 软删除本人账号：状态置 deleted、署名替换、清空资料、吊销会话。 */
export async function deleteOwnAccount(userId: string): Promise<void> {
  await softDeleteUser(userId)
}

/** 彻底擦除本人数据：在软删除基础上清除可识别标识并记录擦除事件。 */
export async function eraseOwnAccount(userId: string): Promise<void> {
  await eraseUser(userId)
}

/**
 * 本人收藏列表：只查当前登录者的收藏，不接受任何 userId 参数，越权面在入口即收窄。
 * 游标解码与公开帖子列表共用 parseCursor：非法游标按参数错误拒绝，不静默退回第一页。
 */
export async function getOwnBookmarks(
  userId: string,
  rawCursor?: unknown,
): Promise<UserPostsPage> {
  const cursor = parseCursor(rawCursor)
  return listBookmarkedPosts(userId, cursor)
}

/**
 * 本人点赞列表：只查当前登录者的点赞，不接受任何 userId 参数，越权面在入口即收窄。
 * 与收藏列表共用 parseCursor：非法游标按参数错误拒绝，不静默退回第一页。
 */
export async function getOwnLikes(
  userId: string,
  rawCursor?: unknown,
): Promise<UserPostsPage> {
  const cursor = parseCursor(rawCursor)
  return listLikedPosts(userId, cursor)
}
