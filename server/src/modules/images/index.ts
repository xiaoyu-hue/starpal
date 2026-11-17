// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 图片模块对外出口（barrel）。
 * 只导出路由与服务，不导出控制器内部实现——其他模块无需知道路由处理细节。
 */
export { imageRouter } from './image.routes.js'
export { avatarRouter } from './avatar.routes.js'
export { avatarStylesController } from './avatar.controller.js'
export { loadImage } from './image.service.js'
export { AVATAR_STYLE_SLUGS } from '../../config/avatar-styles.js'
