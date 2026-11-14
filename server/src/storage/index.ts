// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 存储层对外出口（barrel）。
 *
 * 这是**唯一注入点**：业务模块只从这里拿 `imageStorage`，不直接 import 具体实现。
 * 迁移至对象存储时，只改本文件的导出实现，其余代码零改动（ARCHITECTURE.md §8.4）。
 */
export { imageStorage, createPostgresByteaAdapter } from './postgres-bytea.js'
export { STORAGE_KEY_PATTERN } from './adapter.js'
export type { StorageAdapter, StoragePutInput, StoredBytes, StoredImage } from './adapter.js'
