// SPDX-License-Identifier: AGPL-3.0-or-later
import { Card, Badge } from '../../components/ui/Primitives'
import { ANNOUNCEMENT_KIND_META } from './announcement-kinds'
import type { AnnouncementView } from '../../types/api'

/** 把 ISO 日期（2026-11-14）转成中文短日期；非法值原样返回，不因数据格式问题让整页崩掉。 */
function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const [, year, month, day] = match
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`
}

/**
 * 单条公告卡片。档案与库内通知共用——两者在接口层已收敛成同一种形状，
 * 再按来源分两套 UI 只会让「置顶标记」「类型标签」这类细节慢慢长歪。
 */
export function AnnouncementCard({ item }: { item: AnnouncementView }) {
  // 后端新增类型时老代码不该整块崩掉：取不到就退回「新增功能」，宁可标签不准也不要白屏。
  const kind = ANNOUNCEMENT_KIND_META[item.kind] ?? ANNOUNCEMENT_KIND_META.feature
  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant={kind.variant}>{kind.label}</Badge>
        {item.pinned && <Badge variant="warn">置顶</Badge>}
        <time dateTime={item.date} className="text-xs text-faint">
          {formatDate(item.date)}
        </time>
      </div>
      <h2 className="text-base font-semibold leading-snug text-ink">{item.title}</h2>
      <p className="text-sm leading-relaxed text-muted">{item.summary}</p>
      {item.points.length > 0 && (
        <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
          {item.points.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-faint" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
      {item.action && (
        <p className="rounded-sm border-l-2 border-[var(--sp-accent)] bg-accent-soft px-3 py-2 text-xs leading-relaxed text-muted">
          需要你做的事：{item.action}
        </p>
      )}
    </Card>
  )
}
