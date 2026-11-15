// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react'

/**
 * 成就印章：自绘的九枚几何图形，与站内功能性图标（lucide 线性描边）分属两套语言。
 *
 * 为什么不用图标库：站内的线性图标承担「这里可以点」的信号（发帖、评论、点赞、
 * 发送、话题导航都在用 lucide，笔/气泡/心/纸飞机/层叠全都出现过）。徽章若继续
 * 借用同一套线条，用户会把「被看见」读成点赞按钮，把「递出第一句话」读成发送键。
 * 所以这里换成**粗笔画 + 实心块面**的印章语言：线性图标是操作提示，实心图形是记录。
 *
 * 为什么存在代码里而不是数据库里：用哪个图形纯粹是表现层决策（`014` 原本在
 * `icon` 列存 `pen-line` 这类图标库内部键名，等于把实现细节写进数据）。成就的
 * 语义身份就是它的 `code`，前端按 `code` 查表即可；换一套视觉不需要动数据库。
 *
 * 尺寸约定：24×24 视框，笔画统一 2.6，线帽圆头。实心块用 `fill`，描边图形不填充。
 */
function Seal({ size = 18, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/**
 * 九枚印章。图形刻意避开具象物件（笔、气泡、心、飞机），改用几何构成：
 * 点阵光晕、双弧、三圆三角、递升条形、环中瞳、双环交叠、信封、路径终点、缺角饼。
 * 每枚的轮廓拓扑都不同，13–18px 下也能互相区分。
 */
const SEALS: Record<string, (props: { size?: number }) => ReactNode> = {
  // 初次发声：中心一点 + 断续光晕，第一声扩散出去。
  first_post: ({ size }) => (
    <Seal size={size}>
      <circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="8" strokeDasharray="2 4.283" />
    </Seal>
  ),
  // 回声：两条平行弧，声波折返。
  first_comment: ({ size }) => (
    <Seal size={size}>
      <path d="M9 5 Q 4 12 9 19" />
      <path d="M14 7 Q 9.5 12 14 17" />
    </Seal>
  ),
  // 跨界的：三点成三角，从一个话题走到另一个。
  three_topics: ({ size }) => (
    <Seal size={size}>
      <circle cx="12" cy="6.4" r="2.9" fill="currentColor" stroke="none" />
      <circle cx="6.6" cy="16" r="2.9" fill="currentColor" stroke="none" />
      <circle cx="17.4" cy="16" r="2.9" fill="currentColor" stroke="none" />
    </Seal>
  ),
  // 笔耕不辍：三根递升条形，累积的高度。
  ten_posts: ({ size }) => (
    <Seal size={size}>
      <rect x="4.6" y="13" width="3.2" height="6.4" rx="1.6" fill="currentColor" stroke="none" />
      <rect x="10.4" y="9.4" width="3.2" height="10" rx="1.6" fill="currentColor" stroke="none" />
      <rect x="16.2" y="5.6" width="3.2" height="13.8" rx="1.6" fill="currentColor" stroke="none" />
    </Seal>
  ),
  // 被看见：环中有瞳，注视。
  first_like_received: ({ size }) => (
    <Seal size={size}>
      <circle cx="12" cy="12" r="7.6" />
      <circle cx="12" cy="12" r="2.7" fill="currentColor" stroke="none" />
    </Seal>
  ),
  // 共鸣：两环交叠，彼此有交集。
  twenty_likes: ({ size }) => (
    <Seal size={size}>
      <circle cx="8.9" cy="12" r="5.1" />
      <circle cx="15.1" cy="12" r="5.1" />
    </Seal>
  ),
  // 递出第一句话：信封，第一句被装进去递出去。
  first_message: ({ size }) => (
    <Seal size={size}>
      <rect x="3.8" y="6.8" width="16.4" height="10.4" rx="2.4" />
      <path d="M5.6 9.2 L12 13.6 L18.4 9.2" />
    </Seal>
  ),
  // 引路人：折线路径 + 终点实心点，把人带到路口。
  inviter: ({ size }) => (
    <Seal size={size}>
      <path d="M5.4 18.6 L10.2 13.8 L10.2 8.2 L18.4 8.2" />
      <circle cx="18.4" cy="8.2" r="2.4" fill="currentColor" stroke="none" />
    </Seal>
  ),
  // 同行三十天：缺一角的饼，时间走过四分之三。
  veteran_30: ({ size }) => (
    <Seal size={size}>
      <path d="M12 12 L12 3.2 A8.8 8.8 0 1 0 20.8 12 Z" fill="currentColor" stroke="none" />
    </Seal>
  ),
}

/** 未知 code 的兜底：一枚空环，表示「有此成就但前端还不认识它的图形」。 */
function UnknownSeal({ size }: { size?: number }) {
  return (
    <Seal size={size}>
      <circle cx="12" cy="12" r="6.4" opacity="0.55" />
    </Seal>
  )
}

/**
 * 按成就 `code` 取印章。未知 code 不报错、不空白——给一枚空环，
 * 这样新增成就忘了配图形时页面上仍能看出「这里有一枚成就」。
 */
export function AchievementSeal({ code, size }: { code: string; size?: number }) {
  const Render = SEALS[code] ?? UnknownSeal
  return <>{Render({ size })}</>
}
