// SPDX-License-Identifier: AGPL-3.0-or-later
import { DomainError } from '../../shared/errors.js'
import { imageStorage, STORAGE_KEY_PATTERN, type StoredBytes } from '../../storage/index.js'

/**
 * 图片读取服务。
 *
 * 只做两件事：拒绝畸形键、经存储适配器取字节。不判定帖子可见性——图片键随机生成
 * 且不出现在任何未发布内容的响应里，草稿图在发布前不会暴露给第三方；若将来需要
 * 更严格的访问控制，应在适配器之外叠加一层「键 → 帖子可见性」校验，而不改本层职责。
 */
export async function loadImage(key: string): Promise<StoredBytes> {
  // 畸形键按「不存在」处理：既省掉一次查询，也不区分「键不存在」与「键格式错误」，
  // 避免把存储结构暴露给探测请求。
  if (!STORAGE_KEY_PATTERN.test(key)) {
    throw new DomainError('NOT_FOUND', '图片不存在')
  }

  const found = await imageStorage.get(key)
  if (!found) {
    throw new DomainError('NOT_FOUND', '图片不存在')
  }
  return found
}
