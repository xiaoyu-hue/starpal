// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { Badge, Card } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Dialog'
import { EmptyState, ErrorState } from '../../components/feedback/States'
import { ANNOUNCEMENT_KIND_META } from '../_static'
import { AnnouncementEditor } from './AnnouncementEditor'
import {
  useAdminAnnouncementsQuery,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from './announcements.queries'
import type { AdminAnnouncement } from '../../types/api'

/** 删除确认：公告正文是人工撰写、代码里没有副本，误删代价高，必须二次确认。 */
function DeleteConfirm({ item, onConfirm }: { item: AdminAnnouncement; onConfirm: () => void }) {
  return (
    <Modal
      trigger={
        <button type="button" className={buttonClass('secondary', 'sm')} aria-label={`删除 ${item.title}`}>
          <Trash2 size={14} /> 删除
        </button>
      }
      title="删除这条公告？"
      description={`「${item.title}」删除后前台立即看不到。数据仍保留在数据库中，可由技术侧恢复。`}
    >
      <DialogPrimitive.Close asChild>
        <button type="button" className={buttonClass('primary', 'sm')} onClick={onConfirm}>
          确认删除
        </button>
      </DialogPrimitive.Close>
    </Modal>
  )
}

/**
 * 公告管理：仅管理员可达（路由 RequireRole + 服务端 adminRouter 双守卫）。
 *
 * 这里只管**运营通知**与**当前状态**；功能上线的「发布记录」随代码版本走，
 * 列在列表底部作只读提示——让人清楚「为什么有些公告这里改不了」。
 */
export function AdminAnnouncementsPage() {
  const query = useAdminAnnouncementsQuery()
  const createMutation = useCreateAnnouncement()
  const updateMutation = useUpdateAnnouncement()
  const deleteMutation = useDeleteAnnouncement()
  const [mode, setMode] = useState<'list' | 'new' | AdminAnnouncement>('list')

  if (mode !== 'list') {
    const initial = mode === 'new' ? null : mode
    return (
      <section className="mx-auto max-w-2xl">
        <AnnouncementEditor
          initial={initial}
          onCancel={() => setMode('list')}
          onSubmit={async (payload) => {
            if (initial) {
              await updateMutation.mutateAsync({ id: initial.numericId, payload })
            } else {
              await createMutation.mutateAsync(payload)
            }
            setMode('list')
          }}
        />
      </section>
    )
  }

  const items = query.data ?? []

  return (
    <section aria-labelledby="admin-announcements-heading" className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="admin-announcements-heading" className="text-xl font-semibold text-ink">
            社区公告
          </h1>
          <p className="mt-1 text-sm text-muted">
            新建、编辑、发布与置顶运营通知和「当前状态」。发布记录随代码版本走，不在此处编辑。
          </p>
        </div>
        <button type="button" className={buttonClass('primary', 'sm')} onClick={() => setMode('new')}>
          <Plus size={14} /> 新建公告
        </button>
      </div>

      {query.isPending && <p className="text-sm text-muted">加载中…</p>}
      {query.isError && (
        <ErrorState title="读取失败" description="请确认登录状态后刷新重试。" onRetry={() => void query.refetch()} />
      )}
      {query.data && items.length === 0 && (
        <EmptyState
          title="还没有公告"
          description="第一条公告由你写下。发布后它会出现在公告页与右栏卡片。"
          actionLabel="新建公告"
          onAction={() => setMode('new')}
        />
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const kind = ANNOUNCEMENT_KIND_META[item.kind] ?? ANNOUNCEMENT_KIND_META.feature
          return (
            <Card key={item.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={kind.variant}>{kind.label}</Badge>
                <Badge variant={item.status === 'published' ? 'topic' : 'neutral'}>
                  {item.status === 'published' ? '已发布' : '草稿'}
                </Badge>
                {item.pinned && <Badge variant="warn">置顶</Badge>}
                <time dateTime={item.date} className="text-xs text-faint">
                  {item.date}
                </time>
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonClass('secondary', 'sm')}
                  onClick={() => setMode(item)}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className={buttonClass('secondary', 'sm')}
                  onClick={() =>
                    void updateMutation.mutateAsync({
                      id: item.numericId,
                      payload: { status: item.status === 'published' ? 'draft' : 'published' },
                    })
                  }
                >
                  {item.status === 'published' ? '转为草稿' : '发布'}
                </button>
                <button
                  type="button"
                  className={buttonClass('secondary', 'sm')}
                  onClick={() =>
                    void updateMutation.mutateAsync({
                      id: item.numericId,
                      payload: { isPinned: !item.pinned },
                    })
                  }
                >
                  {item.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {item.pinned ? '取消置顶' : '置顶'}
                </button>
                <DeleteConfirm
                  item={item}
                  onConfirm={() => void deleteMutation.mutateAsync(item.numericId)}
                />
              </div>
            </Card>
          )
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-faint">
        功能上线的「发布记录」写在代码里的公告文档中，随版本发布，
        因此不出现在这张列表里；它的作用是历史档案，不应被随手改写。
      </p>
    </section>
  )
}
