// SPDX-License-Identifier: AGPL-3.0-or-later
/** 应用级常量：限制阈值、状态枚举、排序权重集中于此，禁止散落业务代码。 */
import { ABOUT_DOC } from './docs/about.doc.js'
import { DISCLAIMER_LIABILITY_SECTIONS } from './docs/disclaimer-liability.doc.js'
import { DISCLAIMER_META, DISCLAIMER_SECTIONS } from './docs/disclaimer.doc.js'
import { GUIDELINES_META, GUIDELINES_SECTIONS } from './docs/guidelines.doc.js'
import { PRIVACY_META, PRIVACY_SECTIONS } from './docs/privacy.doc.js'
import { PRODUCT_SCOPE_SECTIONS } from './docs/product-scope.doc.js'
import { PRODUCT_META, PRODUCT_SECTIONS } from './docs/product.doc.js'
import { TERMS_META, TERMS_SECTIONS } from './docs/terms.doc.js'

export const APP_VERSION = '1.4.0'

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

// ── M3-S2 帖子约束与排序参数 ─────────────────────────────────────────
// 排序权重与衰减系数集中于此（PRD §4.2 明确要求不得散落业务代码）；
// 调整本组常量只影响排序结果，不改变 API 契约。

/** 标题上限与 posts.title VARCHAR(180) 的存储上限一致，避免应用层与库层判定分歧。 */
export const POST_TITLE_MAX = 180
export const POST_BODY_MIN = 1
/** 正文上限：规格未冻结，按长文分享上限设定，防止单行拖垮列表查询与备份。 */
export const POST_BODY_MAX = 20_000
/** 摘要长度按字符（码点）计，超出以省略号截断；由服务端生成，不采信客户端。 */
export const POST_EXCERPT_MAX = 140
/** 相关帖子返回上限，仅同话题近期内容。 */
export const POST_RELATED_LIMIT = 5

/**
 * 图片管线参数（ARCHITECTURE.md §8.1）。
 * 统一重编码为 WebP：体积约为原 JPEG 的六成、保留透明通道，且重编码即等于剥离元数据。
 * 长边上限 2048 兼顾详情页清晰度与函数出网流量；实际字节上限由 `MAX_UPLOAD_BYTES` 控制。
 */
export const IMAGE_MAX_DIMENSION = 2048
export const IMAGE_WEBP_QUALITY = 82
/** 首轮编码仍超上限时的降级质量，只降一次，避免无限重试。 */
export const IMAGE_WEBP_QUALITY_FALLBACK = 70
/** 解码像素上限：阻止解压炸弹（小文件解出巨幅位图占满内存）。 */
export const IMAGE_MAX_PIXELS = 40_000_000
/** 单帖图片数量上限，与前端上传位一致。 */
export const POST_IMAGES_MAX = 9

/**
 * 互动域（`M4`）。
 * 评论上限与 `006_comment_length.sql` 的 `comments_body_length` 约束同源：
 * 服务层先给出可读报错，数据库约束兜住绕过服务层的写入。
 *
 * 取值依据：Discourse 默认 32000（论坛长帖语义）、Reddit 评论 10000（英文长评文化）、
 * 微博正文 2000、小红书正文 1000。本项目帖子正文支持 20000，定位偏「有内容的表达」，
 * 故取 2000 —— 与中文社区长评上限一致，同时是正文上限的十分之一，避免评论区变文章区。
 * 长度按 **Unicode 码点** 计（emoji 算 1），与 PostgreSQL `char_length` 同口径。
 */
export const COMMENT_BODY_MAX = 2000
/** 评论最小长度：归一化首尾空白后至少 1 个字符，与数据库的非空约束同源。 */
export const COMMENT_BODY_MIN = 1
/** 评论列表默认页大小；与信息流一致的游标分页口径。 */
export const COMMENT_PAGE_SIZE = 20
/** 评论列表分页上限，防止单次拉取过多。 */
export const COMMENT_MAX_PAGE_SIZE = 50

/** 推荐流取数窗口：超出窗口的内容不再参与加权排序，避免陈年内容长期占据首屏。 */
export const FEED_RECOMMENDED_WINDOW_DAYS = 30
/** 热门流取数窗口：热门是「近期热门」，不是「历史总榜」。 */
export const FEED_POPULAR_WINDOW_DAYS = 7
/** 时间衰减半衰尺度（天）：freshness = exp(-ageDays / 该值)。 */
export const FEED_FRESHNESS_DECAY_DAYS = 7
/** 热度对数缩放：log10(max(净赞,1)) / 该值，将热度归一到 0..1 附近。 */
export const FEED_HOT_LOG_SCALE = 3
/** 热门排序权重：以净赞为主、时间衰减为辅（PRD §4.2「辅以时间衰减」）。 */
export const FEED_POPULAR_WEIGHTS = { hot: 0.7, freshness: 0.3 } as const

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

/**
 * 社区准则：正文在 docs/guidelines.doc.ts，此处只补版本号。
 * 长文从本文件拆出，避免常量文件膨胀成难以维护的巨型文件（单文件 300 行预算）。
 */
export const GUIDELINES = {
  version: APP_VERSION,
  ...GUIDELINES_META,
  sections: GUIDELINES_SECTIONS,
}

// ── M2-S5 说明页（只读常量，不依赖数据库）─────────────────────────────
// 文案随代码版本化，与前端 /api/meta/* 接口一一对应，避免表述与实现对不上。
// 最终对外文案由维护者在发布前审定（PRD §4.12 / §3.3）。

/** 站点名称与建站日期：供「关于」页展示。以首提交日作为建站日期。 */
export const SITE_NAME = '星聚 STARPAL'
export const SITE_LAUNCH_DATE = '2026-11-12'

/**
 * 隐私说明：正文在 docs/privacy.doc.ts。
 * 采集范围、存储位置、保留期、注销与删除方式均按当前后端真实行为撰写，
 * 未实现的能力（改密、自助删帖）在文中明确标注为缺口，不作承诺。
 */
export const PRIVACY = {
  version: APP_VERSION,
  ...PRIVACY_META,
  sections: PRIVACY_SECTIONS,
}

/** 关于页：站点自述 + 技术构成 + 致谢，正文见 docs/about.doc.ts。 */
export const ABOUT = {
  siteName: SITE_NAME,
  version: APP_VERSION,
  launchDate: SITE_LAUNCH_DATE,
  ...ABOUT_DOC,
}

/**
 * 用户协议：正文见 docs/terms.doc.ts。
 * 与社区准则为主从关系——准则构成本协议的一部分，违反准则即违反本协议，
 * 避免两处规则各自演进后互相打架。
 */
export const TERMS = {
  version: APP_VERSION,
  ...TERMS_META,
  sections: TERMS_SECTIONS,
}

/**
 * 免责声明：正文在 docs/disclaimer.doc.ts 与 docs/disclaimer-liability.doc.ts。
 * 与协议的区别：协议约定双方权利义务，声明划定责任边界。
 * 单列一节写明「免不掉的责任」，因为《民法典》第 506 条下整句免责本就无效。
 */
export const DISCLAIMER = {
  version: APP_VERSION,
  ...DISCLAIMER_META,
  sections: [...DISCLAIMER_SECTIONS, ...DISCLAIMER_LIABILITY_SECTIONS],
}

/**
 * 产品声明：正文在 docs/product.doc.ts 与 docs/product-scope.doc.ts。
 * 定位、开放范围、合规状态的正式说明，避免被误认为商业平台或公共服务。
 */
export const PRODUCT = {
  siteName: SITE_NAME,
  version: APP_VERSION,
  ...PRODUCT_META,
  sections: [...PRODUCT_SECTIONS, ...PRODUCT_SCOPE_SECTIONS],
}

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
  'password_change_ok',
  'password_change_fail',
] as const
export type SecurityEventKind = (typeof SECURITY_EVENT_KINDS)[number]

// ── M2-S3 角色 ───────────────────────────────────────────────────────
/** 角色名与 001 迁移 roles 表种子数据一致；业务代码禁止写死角色字符串。 */
export const ROLES = ['user', 'admin'] as const
export type Role = (typeof ROLES)[number]
export const ROLE_USER: Role = 'user'
export const ROLE_ADMIN: Role = 'admin'

// ── M5.5-S1 用户头衔 ─────────────────────────────────────────────────
// 头衔为预设目录，id 与 012 迁移的 CHECK 约束白名单一致；业务代码禁止写死头衔字符串。
// 颜色与语义固定：社区长=金色（权力）、创始人=品牌紫（项目色）、管理员=青色（运营），
// 由前端设计令牌着色，不随用户存储，防止任意自定义颜色。
export const TITLE_IDS = ['community_leader', 'founder', 'admin'] as const
export type TitleId = (typeof TITLE_IDS)[number]
/** 搜索关键词最大长度：防止超长输入构造巨型 ILIKE 模式；超出按校验失败处理。 */
export const SEARCH_TERM_MAX = 100

export const TITLE_LABELS: Record<TitleId, string> = {
  community_leader: '社区长',
  founder: '创始人',
  admin: '管理员',
}

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

// 举报 / 申诉常量见 ./report-constants.ts（保持本文件在行数预算内）。
