// SPDX-License-Identifier: AGPL-3.0-or-later
import { Card } from '../../components/ui/Primitives'
import type { LevelProgress } from '../../types/level'

type LevelCardProps = LevelProgress & {
  /** 等级怎么来的，服务端生成的一句话。 */
  basis: string
}

/**
 * 等级牌：左边一枚圆形等级徽章，右边段位与累计经验，底下一句说明。
 *
 * 视觉取舍：
 * - 段位用**石板灰蓝**，不与金 / 紫 / 青（头衔）和陶土棕（成就）撞色。
 *   段位是「资历刻度」，既不是权力也不是纪念，颜色上就该更安静——读者一眼能分出
 *   「创始人是身份」而「元老只是来得久」。
 * - **不画进度条、不写「还差 X 经验」**：那是催促，越界到 `FR-ACH-04`。
 *   这里只给已经发生的事实（当前等级、当前经验），不给目标。
 */
export function LevelCard({ level, rank, experience, basis }: LevelCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--sp-level)', backgroundColor: 'var(--sp-level-soft)' }}
          aria-label={`等级 ${level}`}
        >
          <span className="text-[10px] leading-none text-faint">LV</span>
          <span
            className="text-base font-semibold leading-tight tabular-nums"
            style={{ color: 'var(--sp-level)' }}
          >
            {level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium"
              style={{ color: 'var(--sp-level)', borderColor: 'var(--sp-level)' }}
            >
              {rank}
            </span>
            <span className="text-xs text-faint tabular-nums">{experience} 经验</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-faint">{basis}</p>
        </div>
      </div>
    </Card>
  )
}
