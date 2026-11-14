// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 认证相关的前端展示常量。
 * 与 server/src/config/constants.ts 的 PASSWORD_MIN / PASSWORD_MAX 保持一致；
 * 服务端校验始终是最终判定，此处仅用于即时提示与输入框上限，避免同一数字多处写死。
 */
export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128
