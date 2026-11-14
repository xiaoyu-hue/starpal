// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 图片上传对外类型。
 *
 * `url` 由服务端拼好：前端不必知道路由布局，将来换成对象存储域名时只改这一处。
 */
export type UploadedImage = {
  id: number
  /** 32 位随机键，与 `post_images.storage_key` 一致。 */
  key: string
  /** 可直接用于 `<img src>` 的读取地址。 */
  url: string
  mimeType: string
  width: number
  height: number
  byteSize: number
  /** 同帖内从 0 递增，前端据此排序。 */
  sortOrder: number
}
