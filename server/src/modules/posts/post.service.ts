// SPDX-License-Identifier: AGPL-3.0-or-later
import { FEED_PAGE_SIZE, POST_EXCERPT_MAX } from '../../config/constants.js'
import { DomainError } from '../../shared/errors.js'
import { encodeCursor } from '../../shared/pagination.js'
import {
  countAuthorPosts,
  listAuthorPosts,
  listFeedPosts,
  listRelatedPosts,
} from './post.feed.repository.js'
import {
  createPost as insertPost,
  findPostById,
  softDeletePost,
  updatePost as persistPost,
} from './post.repository.js'
import { attachViewerFlags } from '../interactions/index.js'
import type { PostRecord } from './post.projection.js'
import type {
  CreatePostInput,
  FeedQuery,
  UpdatePostInput,
} from './post.schema.js'
import type { PostDetail, PostListItem, PostPage, PostStatus } from './post.types.js'

/** 调用方身份：未登录为 null；管理员可越权查看已移除内容。 */
export type Viewer = { id: string; role: string } | null

/**
 * 摘要生成：服务端统一生成，不采信客户端（FR-POST-06）。
 * 折叠所有空白为单空格以避免卡片换行错乱；按码点截断，避免切断 emoji 代理对。
 */
export function buildExcerpt(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  const chars = Array.from(flat)
  if (chars.length <= POST_EXCERPT_MAX) return flat
  return `${chars.slice(0, POST_EXCERPT_MAX).join('')}…`
}

function toListItem(record: PostRecord): PostListItem {
  return {
    id: record.id,
    title: record.title,
    excerpt: record.excerpt,
    topic: record.topic,
    author: record.author,
    likeCount: record.likeCount,
    commentCount: record.commentCount,
    bookmarkCount: record.bookmarkCount,
    isLiked: record.isLiked,
    isBookmarked: record.isBookmarked,
    images: record.images,
    createdAt: record.createdAt,
  }
}

function toDetail(record: PostRecord, isAuthor: boolean): PostDetail {
  return {
    ...toListItem(record),
    topicId: record.topicId,
    body: record.body,
    status: record.status as PostStatus,
    updatedAt: record.updatedAt,
    isAuthor,
  }
}

/**
 * 可见性判定（FR-POST-04）：
 * - published：公开；
 * - removed：仅管理员可见，他人按不存在处理（不泄露「存在但被处理」）；
 * - draft：仅作者本人；
 * - deleted：一律不可见（含作者），软删除即视为已删除。
 * 不可见统一抛 NOT_FOUND，避免通过状态差异枚举他人内容。
 */
function authorize(record: PostRecord, viewer: Viewer): { isAuthor: boolean; isAdmin: boolean } {
  const isAuthor = viewer !== null && String(record.authorId) === viewer.id
  const isAdmin = viewer !== null && viewer.role === 'admin'
  if (record.status === 'published') return { isAuthor, isAdmin }
  if (record.status === 'deleted') throw new DomainError('NOT_FOUND', '帖子不存在')
  if (record.status === 'removed') {
    if (!isAdmin) throw new DomainError('NOT_FOUND', '帖子不存在')
    return { isAuthor, isAdmin }
  }
  if (!isAuthor) throw new DomainError('NOT_FOUND', '帖子不存在')
  return { isAuthor, isAdmin }
}

/** 创建：话题存在性由仓储在事务内校验，摘要由服务端生成。 */
export async function createPost(authorId: string, input: CreatePostInput): Promise<PostDetail> {
  const record = await insertPost(authorId, {
    title: input.title,
    body: input.body,
    excerpt: buildExcerpt(input.body),
    topicId: input.topicId,
  })
  return toDetail(record, true)
}

export async function getPostDetail(id: number, viewer: Viewer): Promise<PostDetail> {
  const record = await findPostById(id)
  if (record === null) throw new DomainError('NOT_FOUND', '帖子不存在')
  const { isAuthor } = authorize(record, viewer)
  const [detail] = await attachViewerFlags([toDetail(record, isAuthor)], viewer?.id ?? null)
  return detail!
}

/** 编辑：作者或管理员；他人请求返回 FORBIDDEN（已确认存在，故与 NOT_FOUND 区分）。 */
export async function updatePost(
  id: number,
  viewer: Viewer,
  input: UpdatePostInput,
): Promise<PostDetail> {
  const existing = await findPostById(id)
  if (existing === null) throw new DomainError('NOT_FOUND', '帖子不存在')
  const { isAuthor, isAdmin } = authorize(existing, viewer)
  if (!isAuthor && !isAdmin) throw new DomainError('FORBIDDEN', '只能编辑自己发布的内容')

  if (existing.status === 'deleted') throw new DomainError('NOT_FOUND', '帖子不存在')
  if (existing.status === 'removed' && !isAdmin) {
    throw new DomainError('FORBIDDEN', '内容已被移除，无法编辑')
  }

  const updated = await persistPost(id, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.body !== undefined
      ? { body: input.body, excerpt: buildExcerpt(input.body) }
      : {}),
    ...(input.topicId !== undefined ? { topicId: input.topicId } : {}),
  })
  if (updated === null) throw new DomainError('NOT_FOUND', '帖子不存在')
  return toDetail(updated, isAuthor || isAdmin)
}

/** 删除：作者或管理员；软删除保留行以便审计，重复删除按不存在处理。 */
export async function deletePost(id: number, viewer: Viewer): Promise<void> {
  const existing = await findPostById(id)
  if (existing === null) throw new DomainError('NOT_FOUND', '帖子不存在')
  const { isAuthor, isAdmin } = authorize(existing, viewer)
  if (!isAuthor && !isAdmin) throw new DomainError('FORBIDDEN', '只能删除自己发布的内容')
  const done = await softDeletePost(id)
  if (!done) throw new DomainError('NOT_FOUND', '帖子不存在')
}

/**
 * 供附属能力复用（图片上传、评论等）：确认调用方可以改动该帖子。
 *
 * 判定与 `updatePost` 完全一致，两处共用 `authorize`，避免权限规则在模块间漂移。
 * 返回主键字符串形式，调用方无需再解析内部类型。
 */
export async function ensurePostEditable(
  id: number,
  viewer: Viewer,
): Promise<{ authorId: string }> {
  const existing = await findPostById(id)
  if (existing === null) throw new DomainError('NOT_FOUND', '帖子不存在')
  const { isAuthor, isAdmin } = authorize(existing, viewer)
  if (!isAuthor && !isAdmin) throw new DomainError('FORBIDDEN', '无权修改该内容')
  if (existing.status === 'removed' && !isAdmin) {
    throw new DomainError('FORBIDDEN', '内容已被移除，无法修改')
  }
  return { authorId: String(existing.authorId) }
}

/** 帖子引用的最小投影：供评论等附属模块判定可见性与归属，不暴露完整记录。 */
export type PostRef = { id: number; authorId: string; status: string }

/**
 * 取帖子并做可见性判定；不可见一律按不存在处理。
 * 与详情接口同一套 `authorize`，避免「详情看不到却能评论」这类入口不一致。
 */
export async function loadVisiblePost(id: number, viewer: Viewer): Promise<PostRef> {
  const record = await findPostById(id)
  if (record === null) throw new DomainError('NOT_FOUND', '帖子不存在')
  authorize(record, viewer)
  return { id: record.id, authorId: String(record.authorId), status: record.status }
}

/**
 * 游标生成：latest 用创建时间，popular / recommended 用综合分。
 * 游标只承载排序键与主键，对客户端不透明；不带业务语义。
 */
function nextCursorOf(last: PostRecord, tab: FeedQuery['tab']): string | null {
  if (tab === 'latest') return encodeCursor({ t: last.createdAt, id: String(last.id) })
  if (last.rankScore === undefined) return null
  return encodeCursor({ t: String(last.rankScore), id: String(last.id) })
}

export async function listFeed(query: FeedQuery, viewer: Viewer = null): Promise<PostPage> {
  const { rows, hasMore } = await listFeedPosts(query)
  const last = rows[rows.length - 1]
  const items = await attachViewerFlags(rows.map(toListItem), viewer?.id ?? null)
  return {
    items,
    nextCursor: hasMore && last ? nextCursorOf(last, query.tab) : null,
    hasMore,
  }
}

/** 相关帖子：先按可见性校验目标帖子，再取同话题内容。 */
export async function listRelated(id: number, viewer: Viewer): Promise<PostListItem[]> {
  const record = await findPostById(id)
  if (record === null) throw new DomainError('NOT_FOUND', '帖子不存在')
  authorize(record, viewer)
  const rows = await listRelatedPosts(record.id, record.topicId)
  return attachViewerFlags(rows.map(toListItem), viewer?.id ?? null)
}

/** 公开个人页帖子：仅已发布内容，按时间倒序游标分页。 */
export async function listUserPosts(
  authorId: string,
  cursor: { t: string; id: string } | null,
  limit = FEED_PAGE_SIZE,
  viewerId: string | null = null,
): Promise<PostPage> {
  const { rows, hasMore } = await listAuthorPosts(authorId, cursor, limit)
  const last = rows[rows.length - 1]
  const items = await attachViewerFlags(rows.map(toListItem), viewerId)
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor({ t: last.createdAt, id: String(last.id) }) : null,
    hasMore,
  }
}

export async function countPostsOf(authorId: string): Promise<number> {
  return countAuthorPosts(authorId)
}
