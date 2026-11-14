// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react'

/** 响应式断点（与 ARCHITECTURE §4.9 一致）：1280 / 1024 / 768。 */
export const BREAKPOINTS = { desktop: 1280, laptop: 1024, tablet: 768 } as const

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.tablet - 1}px)`)
}

export function useHasThreeColumns(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`)
}
