import { DomainError } from '../../shared/errors.js'
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
  ZODIAC_VALUES,
} from '../../config/constants.js'
import {
  countUserPosts,
  eraseUser,
  findOwnProfileById,
  findPublicProfileByUsername,
  softDeleteUser,
  type ProfileUpdateInput,
  updateProfile,
} from './user.repository.js'
import type { OwnProfile, PublicProfile, UserPostsPage } from './user.types.js'

/** 个人资料业务层：公开投影、本人编辑、软删除与擦除。权限以 principal 为准。 */

/**
 * 公开投影：不返回密码哈希、角色、会话、网络地址等任何内部字段。
 * 已注销账户返回去标识化的「已注销用户」投影；被停用账户按不存在处理。
 */
export async function getPublicProfile(username: string): Promise<PublicProfile> {
  const row = await findPublicProfileByUsername(username)
  if (!row) throw new DomainError('NOT_FOUND', '用户不存在')
  const isDeleted = row.status === 'deleted'
  const showOptional = row.show_optional && !isDeleted
  return {
    username: row.username,
    displayName: isDeleted ? DELETED_DISPLAY_NAME : row.display_name,
    avatarUrl: isDeleted ? null : row.avatar_url,
    biography: isDeleted ? null : row.biography,
    createdAt: row.created_at.toISOString(),
    postCount: await countUserPosts(row.username),
    optional: showOptional
      ? { zodiac: row.zodiac, mbti: row.mbti, ageBand: row.age_band }
      : null,
  }
}

/** 本人视角资料读取（含可选字段真实值与 showOptional 开关）。 */
export async function getOwnProfile(userId: string): Promise<OwnProfile> {
  const row = await findOwnProfileById(userId)
  if (!row) throw new DomainError('NOT_FOUND', '用户不存在')
  return {
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    biography: row.biography,
    createdAt: row.created_at.toISOString(),
    postCount: await countUserPosts(row.username),
    showOptional: row.show_optional,
    zodiac: row.zodiac,
    mbti: row.mbti,
    ageBand: row.age_band,
  }
}

/** 公开个人页帖子占位：M3 落地前恒为空页。 */
export async function getPublicPosts(_username: string): Promise<UserPostsPage> {
  return { items: [], nextCursor: null, hasMore: false }
}

/**
 * 资料编辑：仅处理调用方实际提供的字段（支持逐项清空），逐项校验。
 * 显示名落在 users 表，展示字段落在 user_profiles 表，事务内完成。
 */
export async function updateOwnProfile(
  userId: string,
  raw: unknown,
): Promise<OwnProfile> {
  const body = requireObject(raw)
  const input: ProfileUpdateInput = {}

  if ('displayName' in body) {
    input.displayName = requireString(body.displayName, {
      field: 'displayName',
      min: DISPLAY_NAME_MIN,
      max: DISPLAY_NAME_MAX,
      trim: true,
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
    postCount: await countUserPosts(row.username),
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
