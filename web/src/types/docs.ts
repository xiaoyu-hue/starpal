// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 说明页文案与社区公告的前端契约类型。
 *
 * 从 types/api.ts 拆出：该文件已接近行数预算（300 行），
 * 而这一组类型只被说明页 / 公告页消费，自成一体。
 * 字段与后端 server/src/config/docs/ 下各文档真源一一对应；
 * 前后端各留一份定义是有意的——前端类型是消费契约，不因后端内部重构被动漂移。
 */

/** 元信息（说明页文案）：只读常量经 /api/meta/* 下发，与后端 config/constants 一致。 */

/**
 * 说明页长文的内容块。与后端 config/docs/types.ts 的 DocBlock 一一对应；
 * 前后端各留一份定义是有意的——前端类型是消费契约，不应因后端内部重构而被动漂移。
 */
export type DocBlock =
  | { kind: 'p'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'note'; text: string }

export type DocSection = { heading: string; blocks: DocBlock[] }

/** 文档元信息：摘要给不愿读全文的人，两个日期分别表示「改过」与「生效」。 */
export type DocMeta = {
  title: string
  updatedAt: string
  effectiveAt: string
  summary: string
}

/** 社区准则：与后端 GUIDELINES 一致。 */
export type MetaGuidelines = DocMeta & {
  version: string
  sections: DocSection[]
}

/** 隐私说明：与后端 PRIVACY 一致。 */
export type MetaPrivacy = DocMeta & {
  version: string
  sections: DocSection[]
}

/** 用户协议：与后端 TERMS 一致。结构与准则、隐私说明相同。 */
export type MetaTerms = DocMeta & {
  version: string
  sections: DocSection[]
}

/** 免责声明：责任边界说明，与后端 DISCLAIMER 一致。 */
export type MetaDisclaimer = DocMeta & {
  version: string
  sections: DocSection[]
}

/** 产品声明：定位与合规状态说明，与后端 PRODUCT 一致。 */
export type MetaProduct = DocMeta & {
  siteName: string
  version: string
  sections: DocSection[]
}

/** 关于页：站点自述、技术构成与致谢，与后端 ABOUT 一致。 */
export type MetaAbout = {
  siteName: string
  version: string
  launchDate: string
  tagline: string
  intro: string[]
  whatWeDo: { title: string; body: string }[]
  stack: { group: string; items: { name: string; role: string }[] }[]
  /** 分离式许可与源码获取途径，与后端 ABOUT.licensing 一致。 */
  licensing: {
    heading: string
    intro: string
    items: { label: string; license: string; note: string }[]
    sourceUrl: string
    sourceNote: string
  }
  credits: { heading: string; paragraphs: string[] }
  feedback: { heading: string; paragraphs: string[] }
}

/** 公告类型：决定页面上的标签样式，与后端 AnnouncementKind 一一对应。 */
export type AnnouncementKind = 'feature' | 'fix' | 'rule' | 'status'

/** 单条公告：摘要供右栏卡片，changes 为公告页明细，action 为需要用户配合的事项。 */
export type Announcement = {
  date: string
  kind: AnnouncementKind
  title: string
  summary: string
  changes: string[]
  action?: string
}

/** 社区公告：与后端 ANNOUNCEMENTS 一致，条目按时间倒序。 */
export type MetaAnnouncements = {
  version: string
  title: string
  items: Announcement[]
}

