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

// ── M2 认证与账户约束 ────────────────────────────────────────────────
// 规格只冻结了 users.username VARCHAR(32) / display_name VARCHAR(64) 的存储上限；
// 下列准入数值按 OWASP / NIST SP 800-63B 通行建议确定，集中于此便于调整，
// 不得散落进业务代码（架构 §5.7 / ADR 常量集中约束）。

/** 用户名：登录名，创建后不可改；仅允许 ASCII 字母、数字、下划线。 */
export const USERNAME_MIN = 3
export const USERNAME_MAX = 32
export const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/

/**
 * 密码：NIST SP 800-63B 建议以长度为主，不强加组合规则或定期更换。
 * 上限用于防止超长输入拖垮内存硬哈希造成拒绝服务。
 */
export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128

export const DISPLAY_NAME_MIN = 1
export const DISPLAY_NAME_MAX = 64

/** Argon2id 参数：OWASP 2025 生产推荐档（64 MiB / 3 轮），并行度按单核函数取 1。 */
export const ARGON2_MEMORY_KIB = 65_536
export const ARGON2_ITERATIONS = 3
export const ARGON2_PARALLELISM = 1
export const ARGON2_HASH_LENGTH = 32
export const ARGON2_SALT_BYTES = 16

/** 会话：不透明随机标识存表，Cookie 仅作载体。 */
export const SESSION_COOKIE = 'starpal_session'
export const SESSION_ID_BYTES = 32

/** 蜜罐字段名：前端须以 aria-hidden / tabindex=-1 标注，避免辅助技术误填。 */
export const HONEYPOT_FIELD = 'website'

/** 安全事件种类（对应 ARCHITECTURE.md §7.3 security_events.kind）。 */
export const SECURITY_EVENT_KINDS = [
  'register',
  'login_ok',
  'login_fail',
  'honeypot',
] as const
export type SecurityEventKind = (typeof SECURITY_EVENT_KINDS)[number]

// ── M2-S3 角色 ───────────────────────────────────────────────────────
/** 角色名与 001 迁移 roles 表种子数据一致；业务代码禁止写死角色字符串。 */
export const ROLES = ['user', 'admin'] as const
export type Role = (typeof ROLES)[number]
export const ROLE_USER: Role = 'user'
export const ROLE_ADMIN: Role = 'admin'

// ── M2-S4 个人资料约束 ───────────────────────────────────────────────
// 可选资料与账户核心分离（user_profiles 表）；下列枚举为展示值，集中于此便于调整。
// 星座 / 年龄段使用中文展示值；MBTI 使用国际通行四字母代码。

/** 简介长度上限：规格未冻结，按常见社交资料上限设定，集中此处便于调整。 */
export const BIOGRAPHY_MAX = 300

/** 头像链接长度上限（仅存储外部链接，真实图片上传在 M3-S3 落地）。 */
export const AVATAR_URL_MAX = 2048

/** 星座：十二选填值，不采集出生日期。 */
export const ZODIAC_VALUES = [
  '白羊座',
  '金牛座',
  '双子座',
  '巨蟹座',
  '狮子座',
  '处女座',
  '天秤座',
  '天蝎座',
  '射手座',
  '摩羯座',
  '水瓶座',
  '双鱼座',
] as const
export type Zodiac = (typeof ZODIAC_VALUES)[number]

/** MBTI：十六型选填值。 */
export const MBTI_VALUES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const
export type Mbti = (typeof MBTI_VALUES)[number]

/** 年龄段：不采集生日，仅以年龄段呈现。 */
export const AGE_BAND_VALUES = [
  '18岁以下',
  '18-24岁',
  '25-34岁',
  '35-44岁',
  '45-54岁',
  '55岁以上',
] as const
export type AgeBand = (typeof AGE_BAND_VALUES)[number]

/** 软删除后用于署名的占位显示名，与公开投影层替换逻辑保持一致。 */
export const DELETED_DISPLAY_NAME = '已注销用户'
