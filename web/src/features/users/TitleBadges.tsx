// SPDX-License-Identifier: AGPL-3.0-or-later
import { type ReactNode } from 'react'

/**
 * 头衔目录（M5.5-S1）：id → 中文标签 + 配色 CSS 变量名 + 简短说明。
 * 颜色走设计令牌，不在组件里写死色值（web R2 规则）；id 与后端 012 迁移 CHECK 白名单一致。
 */
export const TITLE_CATALOG: Record<
  string,
  { label: string; varName: string; note: string }
> = {
  community_leader: {
    label: '社区长',
    varName: '--sp-title-community-leader',
    note: '金色 · 代表权力与责任',
  },
  founder: {
    label: '创始人',
    varName: '--sp-title-founder',
    note: '紫色 · 项目品牌色',
  },
  admin: {
    label: '管理员',
    varName: '--sp-title-admin',
    note: '青色 · 运营管理',
  },
}

type TitleBadgesProps = {
  titles: string[] | undefined
  /** 紧凑模式：用于署名行内，缩小间距。 */
  size?: 'sm' | 'md'
  className?: string
}

/** 头衔徽章：渲染用户携带的若干头衔，颜色取各自的设计令牌。无头衔时返回 null。 */
export function TitleBadges({ titles, size = 'md', className }: TitleBadgesProps): ReactNode {
  const items = (titles ?? []).map((id) => TITLE_CATALOG[id]).filter(Boolean)
  if (items.length === 0) return null
  const pad = size === 'sm' ? 'px-1.5 py-px text-[11px]' : 'px-2 py-0.5 text-xs'
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className ?? ''}`}>
      {items.map((meta) => (
        <span
          key={meta.label}
          className={`inline-flex items-center rounded-sm border font-medium ${pad}`}
          style={{ color: `var(${meta.varName})`, borderColor: `var(${meta.varName})` }}
        >
          {meta.label}
        </span>
      ))}
    </span>
  )
}
