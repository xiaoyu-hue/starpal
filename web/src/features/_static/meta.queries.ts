import { useQuery } from '@tanstack/react-query'
import {
  fetchAbout,
  fetchAnnouncements,
  fetchDisclaimer,
  fetchGuidelines,
  fetchPrivacy,
  fetchProduct,
  fetchTerms,
} from './meta.api'

/** 缓存键按域命名，各说明页独立，互不串数据。 */
export const metaKeys = {
  guidelines: ['meta', 'guidelines'] as const,
  privacy: ['meta', 'privacy'] as const,
  terms: ['meta', 'terms'] as const,
  disclaimer: ['meta', 'disclaimer'] as const,
  product: ['meta', 'product'] as const,
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

/** 用户协议：注册页的「已阅读并同意」与协议页读同一份文案。 */
export function useTermsQuery() {
  return useQuery({
    queryKey: metaKeys.terms,
    queryFn: ({ signal }) => fetchTerms(),
  })
}

/** 免责声明：与协议配套，说明责任边界。 */
export function useDisclaimerQuery() {
  return useQuery({
    queryKey: metaKeys.disclaimer,
    queryFn: ({ signal }) => fetchDisclaimer(),
  })
}

/** 产品声明：定位、开放范围与合规状态。 */
export function useProductQuery() {
  return useQuery({
    queryKey: metaKeys.product,
    queryFn: ({ signal }) => fetchProduct(),
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
