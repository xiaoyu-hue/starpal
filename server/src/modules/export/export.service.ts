// SPDX-License-Identifier: AGPL-3.0-or-later
import { pool } from '../../db/pool.js'
import { DomainError } from '../../shared/errors.js'
import type { RowExecutor } from '../posts/index.js'
import {
  findProfile,
  listOwnComments,
  listOwnImages,
  listOwnPosts,
  type ImageRow,
} from './export.repository.js'
import type {
  ExportBundle,
  ExportComment,
  ExportFormat,
  ExportImage,
  ExportPost,
  ExportProfile,
} from './export.types.js'

/** 导出文件的结构版本。字段只增不改，接收方可据此判断兼容性。 */
export const SCHEMA_VERSION = 1

/** 状态的中文标注：导出要让人看懂，而不是丢一串数据库枚举值。 */
const STATUS_LABEL: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  removed: '已被下架',
  deleted: '已删除',
}

const CST_OFFSET_MS = 8 * 3600_000

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * 东八区格式化（人读用）。
 *
 * 中国自 1991 年起不实行夏令时，UTC+8 恒定，故用固定偏移而非本地时区 API——
 * Serverless 运行环境的时区不保证是 Asia/Shanghai，用 `toLocaleString` 会随实例漂移。
 */
function toCst(iso: string): string {
  const t = new Date(Date.parse(iso) + CST_OFFSET_MS)
  return (
    `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())} ` +
    `${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}`
  )
}

function toImages(rows: ImageRow[], baseUrl: string): Map<number, ExportImage[]> {
  const grouped = new Map<number, ExportImage[]>()
  for (const row of rows) {
    const list = grouped.get(row.post_id) ?? []
    list.push({
      url: `${baseUrl}/api/images/${row.storage_key}`,
      originalName: row.original_name,
      mimeType: row.mime_type,
      width: row.width,
      height: row.height,
    })
    grouped.set(row.post_id, list)
  }
  return grouped
}

/**
 * 组装导出内容。
 *
 * `baseUrl` 由调用方按请求来源拼出（如 `https://starpal.cc.cd`），用于把图片引用
 * 变成可直接点开的绝对地址。传空串则退化为站内相对路径——离线查看时仍然可读，
 * 只是需要自己补域名。
 */
export async function buildBundle(
  userId: string,
  baseUrl = '',
  executor: RowExecutor = pool,
): Promise<ExportBundle> {
  const [profileRow, postRows, imageRows, commentRows] = await Promise.all([
    findProfile(userId, executor),
    listOwnPosts(userId, executor),
    listOwnImages(userId, executor),
    listOwnComments(userId, executor),
  ])

  if (!profileRow) {
    throw new DomainError('NOT_FOUND', '账号不存在')
  }

  const user: ExportProfile = {
    username: profileRow.username,
    displayName: profileRow.display_name,
    joinedAt: profileRow.created_at.toISOString(),
    lastLoginAt: profileRow.last_login_at?.toISOString() ?? null,
    avatarUrl: profileRow.avatar_url,
    biography: profileRow.biography,
    zodiac: profileRow.zodiac,
    mbti: profileRow.mbti,
    ageBand: profileRow.age_band,
    showOptional: profileRow.show_optional,
  }

  const imagesByPost = toImages(imageRows, baseUrl)

  const posts: ExportPost[] = postRows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    excerpt: row.excerpt,
    topic: { slug: row.topic_slug, name: row.topic_name },
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
    images: imagesByPost.get(row.id) ?? [],
  }))

  const comments: ExportComment[] = commentRows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    postTitle: row.post_title,
    body: row.body,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  }))

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    user,
    posts,
    comments,
  }
}

/** 多行文本转引用块：简介与正文都可能换行，直接塞进列表项会把 Markdown 结构弄坏。 */
function quote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`.trimEnd())
    .join('\n')
}

function statusOf(status: string): string {
  return STATUS_LABEL[status] ?? status
}

function renderProfile(user: ExportProfile): string {
  const lines = [
    `- 用户名：@${user.username}`,
    `- 显示名：${user.displayName}`,
    `- 加入时间：${toCst(user.joinedAt)}`,
    `- 最近登录：${user.lastLoginAt ? toCst(user.lastLoginAt) : '无记录'}`,
    `- 头像：${user.avatarUrl ?? '未设置'}`,
  ]
  if (user.zodiac) lines.push(`- 星座：${user.zodiac}`)
  if (user.mbti) lines.push(`- MBTI：${user.mbti}`)
  if (user.ageBand) lines.push(`- 年龄段：${user.ageBand}`)
  lines.push(`- 可选资料公开：${user.showOptional ? '是' : '否'}`)

  const parts = ['## 资料', '', lines.join('\n')]
  if (user.biography) {
    parts.push('', '**简介**', '', quote(user.biography))
  }
  return parts.join('\n')
}

function renderPost(post: ExportPost, index: number): string {
  const lines = [
    `### ${index + 1}. ${post.title}`,
    '',
    `- 话题：${post.topic.name}（${post.topic.slug}）`,
    `- 状态：${statusOf(post.status)}`,
    `- 发布：${toCst(post.createdAt)}`,
    `- 最后更新：${toCst(post.updatedAt)}`,
  ]
  if (post.deletedAt) lines.push(`- 删除时间：${toCst(post.deletedAt)}`)
  if (post.images.length > 0) {
    lines.push('- 图片：')
    for (const image of post.images) {
      lines.push(`  - ${image.url}（${image.originalName}，${image.width}×${image.height}）`)
    }
  }
  lines.push('', '**正文**', '', post.body)
  return lines.join('\n')
}

function renderComment(comment: ExportComment, index: number): string {
  return [
    `### ${index + 1}. 回复《${comment.postTitle}》`,
    '',
    `- 状态：${statusOf(comment.status)}`,
    `- 时间：${toCst(comment.createdAt)}`,
    '',
    quote(comment.body),
  ].join('\n')
}

/**
 * 渲染人读版 Markdown。
 *
 * 顺序与 JSON 一致（资料 → 帖子 → 评论），时间用东八区便于对照，状态用中文标注。
 * 正文原样输出、不做转义——转义会破坏用户自己写的 Markdown，而导出文件的第一用途
 * 就是「拿去别处还能读」。
 */
export function renderMarkdown(bundle: ExportBundle): string {
  const head = [
    '# 星聚 STARPAL · 数据导出',
    '',
    `> 导出时间：${toCst(bundle.generatedAt)}（东八区）`,
    `> 账号：@${bundle.user.username}`,
    '> 范围：你本人发布的帖子、评论、图片引用与资料字段，不含其他用户的内容。',
    '> 说明：帖子与评论保留删除状态，便于完整还原你写过什么；图片以可访问地址引用，不含二进制。',
    '',
  ].join('\n')

  const sections = [head, renderProfile(bundle.user)]

  sections.push(
    `## 帖子（共 ${bundle.posts.length} 篇）\n\n` +
      (bundle.posts.length === 0
        ? '还没有发布过帖子。'
        : bundle.posts.map((post, i) => renderPost(post, i)).join('\n\n---\n\n')),
  )

  sections.push(
    `## 评论（共 ${bundle.comments.length} 条）\n\n` +
      (bundle.comments.length === 0
        ? '还没有发表过评论。'
        : bundle.comments
            .map((comment, i) => renderComment(comment, i))
            .join('\n\n---\n\n')),
  )

  return `${sections.join('\n\n')}\n`
}

/** 文件名只保留安全字符：用户名来自数据库，但文件名要经得起各种客户端的解析。 */
function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'user'
}

/** 文件名带东八区时间戳，多次导出不会互相覆盖，也便于排序。 */
export function fileNameOf(bundle: ExportBundle, format: ExportFormat, now = new Date()): string {
  const stamp = toCst(now.toISOString()).replace(/[-: ]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2')
  return `starpal-${safeSegment(bundle.user.username)}-${stamp}.${format}`
}
