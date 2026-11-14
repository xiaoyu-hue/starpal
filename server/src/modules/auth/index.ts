// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * auth 模块公共出口（barrel）。
 * 其他模块需要复用本模块能力时，必须经此公共表面，不得穿透到内部文件，
 * 以守住模块边界（IR-06）。内部文件之间仍直接相对引用。
 */
export { clearSessionCookie, readSessionId } from './session.js'
export { currentUser } from './auth.service.js'
