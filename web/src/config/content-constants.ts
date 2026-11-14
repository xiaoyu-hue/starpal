/**
 * 内容域前端常量：与 server/src/config/constants.ts 的 POST_TITLE_MAX / POST_BODY_MAX 对齐。
 * 前端校验只用于即时提示，服务端仍会独立校验一遍——这里放宽或收紧都不构成安全边界。
 */
export const POST_TITLE_MAX = 180
export const POST_BODY_MAX = 20_000
