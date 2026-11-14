/**
 * 内容域前端常量：与 server/src/config/constants.ts 的 POST_TITLE_MAX / POST_BODY_MAX /
 * POST_IMAGES_MAX、以及 MAX_UPLOAD_BYTES 对齐。
 * 前端校验只用于即时提示，服务端仍会独立校验一遍——这里放宽或收紧都不构成安全边界。
 */
export const POST_TITLE_MAX = 180
export const POST_BODY_MAX = 20_000

/** 单帖图片上限，与 POST_IMAGES_MAX 一致。 */
export const POST_IMAGES_MAX = 9
/** 单张上限 3 MB，与 MAX_UPLOAD_BYTES（3145728）一致。 */
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024
/**
 * 可上传类型：与服务端管线白名单一致。
 * 刻意不含 SVG（可内嵌脚本，属可执行内容）与 GIF（动图体积不可控）。
 */
export const IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/** 供 `<input accept>` 使用，只影响文件选择器的默认过滤，不构成校验。 */
export const IMAGE_ACCEPT_ATTR = IMAGE_ACCEPTED_TYPES.join(',')

/** 图片读取地址：键由服务端下发，前端不自造。 */
export function imageUrl(key: string): string {
  return `/api/images/${key}`
}

/** 把字节数转成一句人话，用于超限提示。 */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
}
