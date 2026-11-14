// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Primitives'
import { useRelatedPostsQuery } from '../queries'

/** 相关帖子：同话题的其他内容。没有结果时整块不渲染，不留一个空标题占位。 */
export function RelatedPosts({ postId }: { postId: number }) {
  const query = useRelatedPostsQuery(postId)

  if (query.isPending) {
    return (
      <div className="space-y-2" role="status" aria-label="正在加载相关帖子">
        <div className="sp-skeleton h-4 w-24 rounded-sm" />
        <div className="sp-skeleton h-16 w-full rounded-md" />
      </div>
    )
  }

  const items = query.data ?? []
  if (query.isError || items.length === 0) return null

  return (
    <section aria-labelledby="related-heading">
      <h2 id="related-heading" className="mb-2 text-sm font-medium text-muted">
        同话题的其他内容
      </h2>
      <Card className="divide-y divide-[var(--sp-line)] p-0">
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/posts/${item.id}`}
            className="sp-transition block px-4 py-3 hover:bg-subtle"
          >
            <p className="line-clamp-1 text-sm font-medium text-ink">{item.title}</p>
            <p className="mt-1 line-clamp-1 text-xs text-faint">
              {item.author.displayName} · {new Date(item.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </Link>
        ))}
      </Card>
    </section>
  )
}
