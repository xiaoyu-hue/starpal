// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes } from 'node:crypto'
import { argon2id, argon2Verify } from 'hash-wasm'
import {
  ARGON2_HASH_LENGTH,
  ARGON2_ITERATIONS,
  ARGON2_MEMORY_KIB,
  ARGON2_PARALLELISM,
  ARGON2_SALT_BYTES,
} from '../../config/constants.js'

/**
 * 密码单向哈希：Argon2id（OWASP 首选），经 hash-wasm 的纯 WebAssembly 实现。
 *
 * 为何不用 argon2 / bcrypt 原生模块：Vercel Serverless 官方明确说明这类需编译的
 * 原生依赖在函数环境不保证可用（本项目 M1 部署阶段已验证 nft 打包的脆弱性）。
 * hash-wasm 把 WASM 内联进 JS，零 .node、零独立 .wasm 文件，esbuild 打包后实测可执行。
 *
 * 采用 PHC 编码串（$argon2id$v=19$m=...,t=...,p=...$salt$hash），参数随哈希一起存储：
 * 日后提高强度可直接调常量，旧密码在下一次成功登录时按需重新哈希，无需洗库。
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(ARGON2_SALT_BYTES)
  return argon2id({
    password: password.normalize('NFC'),
    salt,
    parallelism: ARGON2_PARALLELISM,
    iterations: ARGON2_ITERATIONS,
    memorySize: ARGON2_MEMORY_KIB,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: 'encoded',
  })
}

/**
 * 校验密码。哈希串损坏或格式异常时返回 false 而非抛错，
 * 避免把存储层异常暴露成 500 或泄漏账户是否存在。
 */
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    return await argon2Verify({
      password: password.normalize('NFC'),
      hash: encoded,
    })
  } catch {
    return false
  }
}
