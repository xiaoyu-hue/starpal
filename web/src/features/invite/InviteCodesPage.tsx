// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Card } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'
import { StaticPage, StatusLine } from '../_static'
import { fetchInviteCodes, generateInviteCodes, revokeInviteCode } from './invite.api'
import type { InviteCodeItem, InviteCodeStatus } from '../../types/api'
import { ApiError } from '../../lib/api-client'

const INVITE_LIST_KEY = ['admin', 'invite-codes'] as const

function statusMeta(status: InviteCodeStatus): { label: string; variant: 'accent' | 'neutral' | 'warn' } {
  switch (status) {
    case 'available':
      return { label: '可用', variant: 'accent' }
    case 'used':
      return { label: '已使用', variant: 'neutral' }
    case 'revoked':
      return { label: '已撤销', variant: 'warn' }
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 邀请码管理：生成（一次性明文）、查看状态、撤销可用码。仅 admin 可达（路由 + 后端双控）。 */
export function InviteCodesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: INVITE_LIST_KEY,
    queryFn: ({ signal }) => fetchInviteCodes(),
  })
  const qc = useQueryClient()

  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')
  const [newCodes, setNewCodes] = useState<string[]>([])
  const [genState, setGenState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [genMsg, setGenMsg] = useState('')

  async function generate() {
    setGenState('saving')
    setGenMsg('')
    try {
      const result = await generateInviteCodes(count, note.trim() || undefined)
      setNewCodes(result.codes)
      setGenState('idle')
      qc.invalidateQueries({ queryKey: INVITE_LIST_KEY })
    } catch (error) {
      setGenState('error')
      setGenMsg(error instanceof ApiError ? error.message : '生成失败，请稍后重试')
    }
  }

  async function revoke(id: number) {
    try {
      await revokeInviteCode(id)
      qc.invalidateQueries({ queryKey: INVITE_LIST_KEY })
    } catch {
      // 列表会在 invalidate 后刷新；撤销失败（如已被用）由下次的列表状态体现。
    }
  }

  return (
    <StaticPage title="邀请码管理">
      <Card className="space-y-3 p-5">
        <h2 className="text-base font-semibold text-ink">生成邀请码</h2>
        <p className="text-xs leading-relaxed text-muted">
          一人一码，用完即失效。明文只显示这一次，请当场复制发给对方，切勿公开转发。
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-ink">
            数量
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="sp-input ml-2 w-20"
            />
          </label>
          <label className="min-w-[160px] flex-1 text-sm text-ink">
            备注（可选）
            <input
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="发给谁"
              className="sp-input mt-1 w-full"
            />
          </label>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={genState === 'saving'}
            className={buttonClass('primary', 'sm')}
          >
            {genState === 'saving' ? '生成中…' : '生成'}
          </button>
        </div>
        {newCodes.length > 0 && (
          <div className="rounded-sm border border-accent bg-accent-soft p-3">
            <p className="mb-1 text-xs text-faint">新生成的码（仅此一次，请立即复制）：</p>
            <ul className="space-y-1">
              {newCodes.map((code) => (
                <li key={code} className="select-all font-mono text-sm tracking-wider text-ink">
                  {code}
                </li>
              ))}
            </ul>
          </div>
        )}
        {genState === 'error' && <p className="text-xs text-[var(--sp-danger)]">{genMsg}</p>}
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-semibold text-ink">全部邀请码</h2>
        {isLoading && <StatusLine text="加载中…" />}
        {isError && <StatusLine text="加载失败，请刷新重试。" tone="danger" />}
        {data && data.items.length === 0 && (
          <p className="text-sm leading-relaxed text-muted">还没有邀请码。</p>
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-line">
            {data.items.map((item: InviteCodeItem) => {
              const meta = statusMeta(item.status)
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {item.note && <span className="truncate text-sm text-ink">{item.note}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-faint">
                      {formatTime(item.createdAt)}
                      {item.usedByUsername && ` · 使用者 ${item.usedByUsername}`}
                    </p>
                  </div>
                  {item.status === 'available' && (
                    <button
                      type="button"
                      onClick={() => void revoke(item.id)}
                      className={buttonClass('ghost', 'sm')}
                    >
                      撤销
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <div className="flex justify-end">
        <Link to="/settings" className="text-sm text-accent hover:underline">
          返回设置
        </Link>
      </div>
    </StaticPage>
  )
}
