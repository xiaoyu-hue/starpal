// SPDX-License-Identifier: AGPL-3.0-or-later
import { apiGet } from '../../lib/api-client'
import type {
  AnnouncementFeed,
  MetaAbout,
  MetaDisclaimer,
  MetaGuidelines,
  MetaPrivacy,
  MetaProduct,
  MetaTerms,
} from '../../types/api'

/** 说明页元信息接口：只描述路径，传输与错误归一化由 api-client 统一承担。 */

/** 社区准则：消费 /api/meta/guidelines。 */
export async function fetchGuidelines(): Promise<MetaGuidelines> {
  const envelope = await apiGet<MetaGuidelines>('meta/guidelines')
  return envelope.data
}

/** 社区公告：消费 /api/meta/announcements。 */
export async function fetchAnnouncements(): Promise<AnnouncementFeed> {
  const envelope = await apiGet<AnnouncementFeed>('meta/announcements')
  return envelope.data
}

/** 隐私说明：消费 /api/meta/privacy。 */
export async function fetchPrivacy(): Promise<MetaPrivacy> {
  const envelope = await apiGet<MetaPrivacy>('meta/privacy')
  return envelope.data
}

/** 关于页：消费 /api/meta/about，版本号与建站日期读自后端。 */
export async function fetchAbout(): Promise<MetaAbout> {
  const envelope = await apiGet<MetaAbout>('meta/about')
  return envelope.data
}

/** 用户协议：消费 /api/meta/terms，注册勾选同意指向同一份内容。 */
export async function fetchTerms(): Promise<MetaTerms> {
  const envelope = await apiGet<MetaTerms>('meta/terms')
  return envelope.data
}

/** 免责声明：消费 /api/meta/disclaimer。 */
export async function fetchDisclaimer(): Promise<MetaDisclaimer> {
  const envelope = await apiGet<MetaDisclaimer>('meta/disclaimer')
  return envelope.data
}

/** 产品声明：消费 /api/meta/product。 */
export async function fetchProduct(): Promise<MetaProduct> {
  const envelope = await apiGet<MetaProduct>('meta/product')
  return envelope.data
}
