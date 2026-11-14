import { useEffect, useRef } from 'react'

/**
 * 无限滚动哨兵：把 IntersectionObserver 的生命周期收在一处。
 * 依赖项里带 `disabled`，加载中或已无更多时不再重复触发下一页请求。
 */
export function useFeedSentinel(hasNextPage: boolean, isFetchingNextPage: boolean, fetchNext: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNext()
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [fetchNext, hasNextPage, isFetchingNextPage])

  return ref
}
