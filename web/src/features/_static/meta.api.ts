import { apiGet } from '../../lib/api-client'
import type { MetaAbout, MetaAnnouncements, MetaGuidelines, MetaPrivacy } from '../../types/api'

/** 说明页元信息接口：只描述路径，传输与错误归一化由 api-client 统一承担。 */

/** 社区准则：消费 /api/meta/guidelines。 */
export async function fetchGuidelines(): Promise<MetaGuidelines> {
  const envelope = await apiGet<MetaGuidelines>('meta/guidelines')
  return envelope.data
}

/** 社区公告：消费 /api/meta/announcements。 */
export async function fetchAnnouncements(): Promise<MetaAnnouncements> {
  const envelope = await apiGet<MetaAnnouncements>('meta/announcements')
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
