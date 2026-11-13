/** 应用级常量：限制阈值、状态枚举、排序权重集中于此，禁止散落业务代码。 */
export const APP_VERSION = '0.1.0'

export const FEED_TABS = ['recommended', 'latest', 'popular'] as const
export type FeedTab = (typeof FEED_TABS)[number]

/** 推荐排序权重（确定性加权，不含机器学习）。 */
export const FEED_WEIGHTS = {
  topic: 0.4,
  freshness: 0.35,
  hot: 0.25,
} as const

export const FEED_PAGE_SIZE = 20
export const FEED_MAX_PAGE_SIZE = 50

export const POST_STATUS = ['draft', 'published', 'removed', 'deleted'] as const
export const USER_STATUS = ['active', 'suspended', 'deleted'] as const

export const TOPIC_SLUGS = [
  'technology',
  'gaming',
  'anime',
  'learning',
  'lifestyle',
  'creative',
  'science',
  'sports',
  'other',
] as const

export const GUIDELINES = {
  version: APP_VERSION,
  title: '社区准则',
  principles: [
    '尊重每一位成员，不进行人身攻击或歧视性表达。',
    '发布内容须合法，不传播他人隐私与未授权资料。',
    '讨论围绕兴趣与知识展开，避免无关刷屏。',
    '账号仅收集用户名与密码哈希，不收集手机号、邮箱等联系方式。',
  ],
} as const
