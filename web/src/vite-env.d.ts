// SPDX-License-Identifier: AGPL-3.0-or-later
/// <reference types="vite/client" />

/** 构建时由 vite.config.ts 从包版本注入，勿手写，见 `web/vite.config.ts` 的 `define`。 */
declare const __APP_VERSION__: string
