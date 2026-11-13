import type { FeedPost, PageMeta } from '../types/api'

/** 按 ID 去重，保证快速翻页不出现重复条目。 */
export function mergeFeedPages(pages: { items: FeedPost[]; meta?: PageMeta }[]): FeedPost[] {
  const seen = new Set<number>()
  const result: FeedPost[] = []
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      result.push(item)
    }
  }
  return result
}

export function pageMetaOf(meta: unknown): PageMeta {
  if (typeof meta !== 'object' || meta === null) return { nextCursor: null, hasMore: false }
  const value = meta as Partial<PageMeta>
  return {
    nextCursor: typeof value.nextCursor === 'string' ? value.nextCursor : null,
    hasMore: value.hasMore === true,
  }
}
