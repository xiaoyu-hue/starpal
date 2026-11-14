/**
 * 帖子模块对外出口（barrel）。
 * 其他模块只允许经此文件引用本模块，不得穿透到内部控制器的内部文件（lint 强制）。
 */
export { postRouter } from './post.routes.js'
export { countPostsOf, ensurePostEditable, listUserPosts } from './post.service.js'
export type { Viewer } from './post.service.js'
export type { PostDetail, PostListItem, PostPage } from './post.types.js'
