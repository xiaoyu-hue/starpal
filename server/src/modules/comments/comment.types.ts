/**
 * 评论对外的响应形状。
 *
 * `canRemove` 由服务端判定（评论作者或管理员），前端只据此决定是否展示删除入口；
 * 真正的删除权限仍在服务层校验——展示层不构成安全边界（架构 §5.7）。
 */
export type CommentStatus = 'published' | 'removed'

export type CommentItem = {
  id: number
  body: string
  status: CommentStatus
  author: { username: string; displayName: string; avatarUrl: string | null }
  createdAt: string
  isAuthor: boolean
  canRemove: boolean
}

export type CommentPage = {
  items: CommentItem[]
  nextCursor: string | null
  hasMore: boolean
}
