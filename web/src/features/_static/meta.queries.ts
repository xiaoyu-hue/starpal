import { useQuery } from '@tanstack/react-query'
import { fetchAbout, fetchAnnouncements, fetchGuidelines, fetchPrivacy } from './meta.api'

/** 缓存键按域命名，各说明页独立，互不串数据。 */
export const metaKeys = {
  guidelines: ['meta', 'guidelines'] as const,
  privacy: ['meta', 'privacy'] as const,
  announcements: ['meta', 'announcements'] as const,
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

/** 公告同时被右栏卡片与公告页消费，键相同即共享一次请求。 */
export function useAnnouncementsQuery() {
  return useQuery({
    queryKey: metaKeys.announcements,
    queryFn: ({ signal }) => fetchAnnouncements(),
  })
}

export function useAboutQuery() {
  return useQuery({
    queryKey: metaKeys.about,
    queryFn: ({ signal }) => fetchAbout(),
  })
}
