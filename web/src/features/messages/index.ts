// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 私信模块公共出口（barrel）。
 * 与 likes / bookmarks 同一约定：不在此导出 MessagesPage，
 * 路由层按具体路径懒加载，避免把页面并回主包。
 */
export { conversationKeys, useConversationsQuery, useMessagesQuery } from './messages.queries'
