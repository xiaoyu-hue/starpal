/**
 * 图片存储适配器接口（ARCHITECTURE.md §8.2，决策见 ADR-007 / ADR-014）。
 *
 * 业务模块只依赖本接口：切换存储实现（当前 `postgres-bytea`，未来 `r2` / `blob`）
 * 时替换注入的实现即可，上传管线与读取路由不受影响。仓库内**不建立工厂或注册机制**，
 * 只有一个实现、一个注入点（`storage/index.ts`）。
 */

/** 已落库图片的对外引用：读取路由与前端所需的全部元信息，不含字节。 */
export type StoredImage = {
  /** 32 位小写十六进制随机键，兼作缓存键；写入后内容与键均不再变更。 */
  key: string
  /** 由重编码结果判定，不采信客户端声明。 */
  mimeType: string
  width: number
  height: number
  byteSize: number
}

export type StoragePutInput = {
  /** 由上传管线生成（随机十六进制），必须先于元数据插入确定，故不由适配器生成。 */
  key: string
  buffer: Buffer
  mimeType: string
  width: number
  height: number
  /**
   * 归属的 `post_images.id`。
   *
   * 取舍说明：`image_blobs` 以 `image_id` 为主键并外键引用 `post_images`，
   * 因此写字节前必须已有元数据行，适配器需要这个关联键。对象存储实现会忽略它
   * （对象名即 key），接口仍保持可替换。若将来改为以 `storage_key` 直接关联，
   * 可移除本字段而不影响调用方语义。
   */
  imageId: number
}

export type StoredBytes = {
  buffer: Buffer
  mimeType: string
}

export interface StorageAdapter {
  /** 写入字节；同一 key 重复写入视为冲突（内容不可变）。 */
  put(input: StoragePutInput): Promise<StoredImage>
  /** 按键读取；不存在返回 null，由调用方决定错误语义。 */
  get(key: string): Promise<StoredBytes | null>
  /**
   * 删除字节，仅保留元数据行。
   *
   * 正常删除走 `post_images` 级联（`ON DELETE CASCADE`），无需调用本方法；
   * 它用于上传事务回滚与存储迁移时的清理。
   */
  remove(key: string): Promise<void>
}

/** 存储键格式：32 位小写十六进制。读取路由据此拒绝畸形路径，避免无谓查询。 */
export const STORAGE_KEY_PATTERN = /^[a-f0-9]{32}$/
