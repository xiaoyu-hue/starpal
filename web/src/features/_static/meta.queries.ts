import { useQuery } from '@tanstack/react-query'
import { fetchAbout, fetchGuidelines, fetchPrivacy } from './meta.api'

/** 缓存键按域命名，三个说明页各自独立，互不串数据。 */
export const metaKeys = {
  guidelines: ['meta', 'guidelines'] as const,
  privacy: ['meta', 'privacy'] as const,
  about: ['meta', 'about'] as const,
}

export function useGuidelinesQuery() {
  return useQuery({
    queryKey: metaKeys.guidelines,
    queryFn: ({ signal }) => fetchGuidelines(),
  })
}

export function usePrivacyQuery() {
  return useQuery({
    queryKey: metaKeys.privacy,
    queryFn: ({ signal }) => fetchPrivacy(),
  })
}

export function useAboutQuery() {
  return useQuery({
    queryKey: metaKeys.about,
    queryFn: ({ signal }) => fetchAbout(),
  })
}
