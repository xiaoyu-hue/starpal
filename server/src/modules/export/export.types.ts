// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 导出文件的数据形状。
 *
 * 契约来源：`scripts/export-check.mjs` 已先行定义「顶层必须有 `user`，且不得出现
 * `password_hash` / `session` / `role` 等字段」。这里的类型与该脚本保持一致，
 * 校验脚本可对真实产物直接跑，不会出现「脚本一套、实现另一套」。
 */

export type ExportFormat = 'json' | 'md'

/** 资料字段：可选的空值一律保留为 null，让接收方能区分「没填」与「空字符串」。 */
export type ExportProfile = {
  username: string
  displayName: string
  joinedAt: string
  lastLoginAt: string | null
  avatarUrl: string | null
  biography: string | null
  zodiac: string | null
  mbti: string | null
  ageBand: string | null
  showOptional: boolean
}

/**
 * 图片只导出引用，不导出二进制。
 * 二进制会让单份导出轻易超过 Serverless 响应上限（4.5 MB），且图片本身就是
 * 随站点存活的内容；给出可访问地址，接收方按需取用即可。
 */
export type ExportImage = {
  url: string
  originalName: string
  mimeType: string
  width: number
  height: number
}

export type ExportPost = {
  id: number
  title: string
  body: string
  excerpt: string
  topic: { slug: string; name: string }
  /** 含 draft / removed / deleted：本人写过什么，本人有权完整看到，状态如实标注。 */
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  images: ExportImage[]
}

export type ExportComment = {
  id: number
  postId: number
  /** 评论所在帖子的标题；帖子若已被作者删除，标题仍保留，避免评论变成无主孤文。 */
  postTitle: string
  body: string
  status: string
  createdAt: string
}

export type ExportBundle = {
  schemaVersion: number
  generatedAt: string
  user: ExportProfile
  posts: ExportPost[]
  comments: ExportComment[]
}
