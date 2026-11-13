import {
  Bell,
  Compass,
  Home,
  MessageSquare,
  PenLine,
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
  profile: { key: 'profile', label: '我的', path: '/settings', icon: UserRound },
  messages: { key: 'messages', label: '私信', path: '/messages', icon: MessageSquare },
}

/** 桌面顶栏与左栏展开的六个目的地。 */
export const DESKTOP_KEYS = [
  'home',
  'discover',
  'topics',
  'create',
  'notifications',
  'profile',
] as const

/** 移动端底部四项 Tab：话题并入发现，通知移至顶栏，发布为中央凸起按钮。 */
export const MOBILE_TAB_KEYS = ['home', 'discover', 'messages', 'profile'] as const
