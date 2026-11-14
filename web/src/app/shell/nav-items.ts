// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Bookmark,
  Compass,
  FileText,
  Heart,
  Home,
  Info,
  Megaphone,
  MessageSquare,
  Package,
  PenLine,
  ShieldCheck,
  Flag,
  UserRound,
  Layers3,
  type LucideIcon,
} from 'lucide-react'

/** 目的地唯一来源：桌面与移动端共用同一集合，仅折叠方式不同（FR-NAV-06）。 */
export type Destination = {
  key: string
  label: string
  path: string
  icon: LucideIcon
}

export const DESTINATIONS: Record<string, Destination> = {
  home: { key: 'home', label: '首页', path: '/', icon: Home },
  discover: { key: 'discover', label: '发现', path: '/discover', icon: Compass },
  topics: { key: 'topics', label: '话题', path: '/topics', icon: Layers3 },
  create: { key: 'create', label: '发布', path: '/posts/new', icon: PenLine },
  notifications: { key: 'notifications', label: '通知', path: '/notifications', icon: Bell },
  bookmarks: { key: 'bookmarks', label: '我的收藏', path: '/bookmarks', icon: Bookmark },
  likes: { key: 'likes', label: '我的点赞', path: '/likes', icon: Heart },
  reports: { key: 'reports', label: '我的提交', path: '/reports', icon: Flag },
  profile: { key: 'profile', label: '我的', path: '/settings', icon: UserRound },
  messages: { key: 'messages', label: '私信', path: '/messages', icon: MessageSquare },
}

/** 桌面顶栏与左栏展开的九个目的地（顶栏另过滤掉 create / notifications）。 */
export const DESKTOP_KEYS = [
  'home',
  'discover',
  'topics',
  'create',
  'notifications',
  'bookmarks',
  'likes',
  'reports',
  'profile',
] as const

/** 移动端底部四项 Tab：话题并入发现，通知移至顶栏，发布为中央凸起按钮。 */
export const MOBILE_TAB_KEYS = ['home', 'discover', 'messages', 'profile'] as const

/**
 * 说明页入口：桌面侧栏与移动抽屉共用同一份定义。
 * 这三个页面此前只有「个人页底部」一个入口，手机端几乎不可达；
 * 收成一处配置，两端就不存在「加了一边忘了另一边」的可能。
 */
export const ABOUT_LINKS = [
  { key: 'announcements', label: '社区公告', path: '/announcements', icon: Megaphone },
  { key: 'product', label: '产品声明', path: '/product', icon: Package },
  { key: 'guidelines', label: '社区准则', path: '/guidelines', icon: BookOpen },
  { key: 'terms', label: '用户协议', path: '/terms', icon: FileText },
  { key: 'privacy', label: '隐私说明', path: '/privacy', icon: ShieldCheck },
  { key: 'disclaimer', label: '免责声明', path: '/disclaimer', icon: AlertTriangle },
  { key: 'about', label: '关于星聚', path: '/about', icon: Info },
] as const
