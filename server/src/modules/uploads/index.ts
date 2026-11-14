/**
 * 上传模块对外出口（barrel）。
 * 其他模块只允许经此文件引用路由，不得穿透到控制器内部。
 */
export { imageUploadRouter } from './upload.routes.js'
export type { UploadedImage } from './upload.types.js'
