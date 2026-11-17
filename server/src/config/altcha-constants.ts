// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * ALTCHA 人机验证参数（自托管，工作量证明）。
 *
 * 单独成文件以免把通用常量表推过行数预算；与认证常量同源、同时交付。
 */

/** 求解算法：PBKDF2/SHA-256，浏览器 Web Crypto 与 Node 均原生支持。 */
export const ALTCHA_ALGORITHM = 'PBKDF2/SHA-256'
/** 迭代成本：实测求解约 0.3—1.5 秒，在后台 Worker 完成，真人填表时已算好。 */
export const ALTCHA_COST = 10000
/** 挑战有效期 20 分钟（ALTCHA 官方建议区间 20 分钟—1 小时）。 */
export const ALTCHA_EXPIRY_SECONDS = 20 * 60
/** 从 SESSION_SECRET 派生专用密钥时的 HKDF info，做域隔离。 */
export const ALTCHA_HKDF_INFO = 'starpal-altcha-v1'
