import { useEffect, useRef } from 'react'

const PREFIX = 'starpal:scroll:'

/**
 * 滚动位置恢复（M3-S5-T4）。
 *
 * 只在会话内有效：用 sessionStorage 而非 localStorage，关闭标签页即丢弃，
 * 避免下一次访问被带到上次的深处。`ready` 为真（首屏数据已到位）才恢复，
 * 否则列表还没高度，滚下去会被浏览器夹回顶部。
 * 恢复一次后立即清除记录——用户主动回到顶部时不该被旧位置再拉下去。
 */
export function useScrollRestore(key: string, ready: boolean): void {
  const restored = useRef(false)
  const storageKey = `${PREFIX}${key}`

  useEffect(() => {
    restored.current = false
  }, [key])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => {
      window.sessionStorage.setItem(storageKey, String(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [storageKey])

  useEffect(() => {
    if (!ready || restored.current) return
    restored.current = true
    const raw = window.sessionStorage.getItem(storageKey)
    if (raw === null) return
    window.sessionStorage.removeItem(storageKey)
    const y = Number(raw)
    if (!Number.isFinite(y) || y <= 0) return
    // 等一帧，让列表完成布局后再定位，否则会被夹回顶部。
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' }))
  }, [ready, storageKey])
}
