// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge, Card } from '../../components/ui/Primitives'
import { EmptyState, ErrorState } from '../../components/feedback/States'
import { FeedSkeleton } from '../feed'
import {
  useAdminTopicsQuery,
  useCreateTopicMutation,
  useSetTopicArchivedMutation,
  useUpdateTopicMutation,
} from './admin.queries'
import type { AdminTopic, TopicDraft } from '../../types/admin'

const EMPTY_DRAFT: TopicDraft = {
  slug: '',
  nameZh: '',
  nameEn: '',
  description: null,
  icon: null,
  sortOrder: 0,
}

export function AdminTopicsPage() {
  const query = useAdminTopicsQuery()
  const createMutation = useCreateTopicMutation()
  const updateMutation = useUpdateTopicMutation()
  const archiveMutation = useSetTopicArchivedMutation()
  const [draft, setDraft] = useState<TopicDraft | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function beginCreate() {
    setEditingId(null)
    setDraft({ ...EMPTY_DRAFT })
    setError(null)
  }

  function beginEdit(t: AdminTopic) {
    setEditingId(t.id)
    setDraft({
      slug: t.slug,
      nameZh: t.nameZh,
      nameEn: t.nameEn,
      description: t.description,
      icon: t.icon,
      sortOrder: t.sortOrder,
    })
    setError(null)
  }

  function cancel() {
    setDraft(null)
    setEditingId(null)
  }

  async function save() {
    if (!draft) return
    setError(null)
    try {
      if (editingId !== null) {
        await updateMutation.mutateAsync({ id: editingId, draft })
      } else {
        await createMutation.mutateAsync(draft)
      }
      cancel()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  async function toggleArchive(topic: AdminTopic) {
    const next = !topic.archived
    if (next && !window.confirm(`归档话题「${topic.nameZh}」？其帖子将从前台隐藏，可随时恢复。`)) return
    setError(null)
    try {
      await archiveMutation.mutateAsync({ id: topic.id, archived: next })
    } catch {
      setError('归档操作失败，请重试')
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const topics = query.data ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">话题是内容的分类容器。归档后其帖子从前台隐藏，数据保留。</p>
        <Button size="sm" onClick={beginCreate}>
          新建话题
        </Button>
      </div>

      {draft && (
        <Card className="space-y-3 p-4">
          <h2 className="text-base font-semibold text-ink">
            {editingId !== null ? '编辑话题' : '新建话题'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {editingId !== null ? (
              <div>
                <div className="mb-1.5 text-sm font-medium text-ink">Slug（对外定位，不可改）</div>
                <div className="h-10 rounded-md border border-line bg-subtle px-3 py-2 text-sm text-muted">
                  {draft.slug}
                </div>
              </div>
            ) : (
              <Input
                label="Slug"
                value={draft.slug}
                hint="小写字母、数字、连字符，如 tech-news"
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            )}
            <Input
              label="中文名"
              value={draft.nameZh}
              onChange={(e) => setDraft({ ...draft, nameZh: e.target.value })}
            />
            <Input
              label="英文名"
              value={draft.nameEn}
              onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
            />
            <Input
              label="图标名"
              value={draft.icon ?? ''}
              hint="留空用默认图标"
              onChange={(e) => setDraft({ ...draft, icon: e.target.value || null })}
            />
            <Input
              label="排序值"
              type="number"
              min={0}
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
            />
          </div>
          <Input
            label="描述"
            value={draft.description ?? ''}
            hint="留空表示无描述"
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
          />
          {error && <p className="text-sm text-[var(--sp-danger)]" role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" loading={saving} onClick={() => void save()}>保存</Button>
            <Button size="sm" variant="ghost" onClick={cancel}>取消</Button>
          </div>
        </Card>
      )}

      {query.isPending ? (
        <FeedSkeleton count={3} />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : topics.length === 0 ? (
        <EmptyState
          title="暂无话题"
          description="新建一个话题作为内容分类。"
          actionLabel="新建话题"
          onAction={beginCreate}
        />
      ) : (
        topics.map((t) => (
          <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{t.nameZh}</span>
                <span className="text-xs text-faint">/{t.slug}</span>
                {t.isDemo && <Badge variant="neutral">演示</Badge>}
                {t.archived && <Badge variant="warn">已归档</Badge>}
              </div>
              <div className="mt-1 text-xs text-muted">
                {t.nameEn} · 排序 {t.sortOrder}
              </div>
            </div>
            <div className="flex gap-2">
              {!t.archived && (
                <Button size="sm" variant="ghost" onClick={() => beginEdit(t)}>
                  编辑
                </Button>
              )}
              <Button
                size="sm"
                variant={t.archived ? 'primary' : 'secondary'}
                loading={archiveMutation.isPending}
                onClick={() => void toggleArchive(t)}
              >
                {t.archived ? '恢复' : '归档'}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
