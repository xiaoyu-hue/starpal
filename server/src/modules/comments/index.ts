// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 评论模块对外出口（barrel）。
 * 两个路由前缀不同：评论读写挂在帖子下（`/api/posts/:postId/comments`），
 * 删除挂在评论自身（`/api/comments/:id`）——删除不需要知道帖子 id。
 */
export { commentRouter, postCommentRouter } from './comment.routes.js'
export type { CommentItem, CommentPage, CommentStatus } from './comment.types.js'
