// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 自托管头像风格清单：白名单 + 署名元数据的唯一真相源。
 *
 * 数据来自 DiceBear 官网 styles 页与 collection@9.4.2 的实际导出，非臆造。
 * 每一项：
 * - slug：对外 URL 与存储用的稳定标识（连字符小写），不随展示名变化。
 * - styleKey：@dicebear/collection 的导出名（驼峰），用于在服务端取生成器。
 * - author / license / licenseUrl / sourceUrl：图案版权署名信息。
 *
 * 为什么不用包里的 package.json license：那是「生成代码」的许可（多为 MIT），
 * 不是「图案作品」的版权。官网列的作者与 CC 许可才是署名页要用的，用错会违反许可。
 *
 * 只收录有独立 npm 包的 31 种：官网另 30 种动态风格（waves/landscape 等）
 * 仅由官方 HTTP API 提供，自托管拿不到，故不纳入（零外部请求的既定取舍）。
 */

export type AvatarStyle = {
  slug: string
  styleKey: string
  label: string
  author: string
  /** DiceBear 官网对该图案标注的许可；CC BY 必须署名，其余可自由使用。 */
  license: string
  licenseUrl: string | null
  sourceUrl: string
}

const CC_BY = 'https://creativecommons.org/licenses/by/4.0/'
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'

/** 按官网 styles 页顺序排列，前端选择器与署名页共用。 */
export const AVATAR_STYLES: readonly AvatarStyle[] = [
  { slug: 'adventurer', styleKey: 'adventurer', label: 'Adventurer', author: 'Lisa Wischofsky', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/adventurer/' },
  { slug: 'adventurer-neutral', styleKey: 'adventurerNeutral', label: 'Adventurer Neutral', author: 'Lisa Wischofsky', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/adventurer-neutral/' },
  { slug: 'avataaars', styleKey: 'avataaars', label: 'Avataaars', author: 'Pablo Stanley', license: '免费商用', licenseUrl: null, sourceUrl: 'https://www.dicebear.com/styles/avataaars/' },
  { slug: 'avataaars-neutral', styleKey: 'avataaarsNeutral', label: 'Avataaars Neutral', author: 'Pablo Stanley', license: '免费商用', licenseUrl: null, sourceUrl: 'https://www.dicebear.com/styles/avataaars-neutral/' },
  { slug: 'big-ears', styleKey: 'bigEars', label: 'Big Ears', author: 'The Visual Team', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/big-ears/' },
  { slug: 'big-ears-neutral', styleKey: 'bigEarsNeutral', label: 'Big Ears Neutral', author: 'The Visual Team', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/big-ears-neutral/' },
  { slug: 'big-smile', styleKey: 'bigSmile', label: 'Big Smile', author: 'Ashley Seo', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/big-smile/' },
  { slug: 'bottts', styleKey: 'bottts', label: 'Bottts', author: 'Pablo Stanley', license: '免费商用', licenseUrl: null, sourceUrl: 'https://www.dicebear.com/styles/bottts/' },
  { slug: 'bottts-neutral', styleKey: 'botttsNeutral', label: 'Bottts Neutral', author: 'Pablo Stanley', license: '免费商用', licenseUrl: null, sourceUrl: 'https://www.dicebear.com/styles/bottts-neutral/' },
  { slug: 'croodles', styleKey: 'croodles', label: 'Croodles', author: 'vijay verma', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/croodles/' },
  { slug: 'croodles-neutral', styleKey: 'croodlesNeutral', label: 'Croodles Neutral', author: 'vijay verma', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/croodles-neutral/' },
  { slug: 'dylan', styleKey: 'dylan', label: 'Dylan', author: 'Natalia Spivak', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/dylan/' },
  { slug: 'fun-emoji', styleKey: 'funEmoji', label: 'Fun Emoji', author: 'Davis Uche', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/fun-emoji/' },
  { slug: 'glass', styleKey: 'glass', label: 'Glass', author: 'DiceBear', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/glass/' },
  { slug: 'icons', styleKey: 'icons', label: 'Icons', author: 'The Bootstrap Authors', license: 'MIT', licenseUrl: 'https://opensource.org/license/mit', sourceUrl: 'https://www.dicebear.com/styles/icons/' },
  { slug: 'identicon', styleKey: 'identicon', label: 'Identicon', author: 'DiceBear', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/identicon/' },
  { slug: 'initials', styleKey: 'initials', label: 'Initials', author: 'DiceBear', license: 'MIT', licenseUrl: 'https://opensource.org/license/mit', sourceUrl: 'https://www.dicebear.com/styles/initials/' },
  { slug: 'lorelei', styleKey: 'lorelei', label: 'Lorelei', author: 'Lisa Wischofsky', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/lorelei/' },
  { slug: 'lorelei-neutral', styleKey: 'loreleiNeutral', label: 'Lorelei Neutral', author: 'Lisa Wischofsky', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/lorelei-neutral/' },
  { slug: 'micah', styleKey: 'micah', label: 'Micah', author: 'Micah Lanier', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/micah/' },
  { slug: 'miniavs', styleKey: 'miniavs', label: 'Miniavs', author: 'Webpixels', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/miniavs/' },
  { slug: 'notionists', styleKey: 'notionists', label: 'Notionists', author: 'Zoish', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/notionists/' },
  { slug: 'notionists-neutral', styleKey: 'notionistsNeutral', label: 'Notionists Neutral', author: 'Zoish', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/notionists-neutral/' },
  { slug: 'open-peeps', styleKey: 'openPeeps', label: 'Open Peeps', author: 'Pablo Stanley', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/open-peeps/' },
  { slug: 'personas', styleKey: 'personas', label: 'Personas', author: 'Draftbit', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/personas/' },
  { slug: 'pixel-art', styleKey: 'pixelArt', label: 'Pixel Art', author: 'DiceBear', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/pixel-art/' },
  { slug: 'pixel-art-neutral', styleKey: 'pixelArtNeutral', label: 'Pixel Art Neutral', author: 'DiceBear', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/pixel-art-neutral/' },
  { slug: 'rings', styleKey: 'rings', label: 'Rings', author: 'DiceBear', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/rings/' },
  { slug: 'shapes', styleKey: 'shapes', label: 'Shapes', author: 'DiceBear', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/shapes/' },
  { slug: 'thumbs', styleKey: 'thumbs', label: 'Thumbs', author: 'DiceBear', license: 'CC0 1.0', licenseUrl: CC0, sourceUrl: 'https://www.dicebear.com/styles/thumbs/' },
  { slug: 'toon-head', styleKey: 'toonHead', label: 'Toon Head', author: 'Johan Melin', license: 'CC BY 4.0', licenseUrl: CC_BY, sourceUrl: 'https://www.dicebear.com/styles/toon-head/' },
]

/** 种子最大长度：足以表达任何昵称 / 短句，又不会生成超大 SVG。 */
export const AVATAR_SEED_MAX = 64
/**
 * 种子允许的字符集：字母、数字、空格、连字符、下划线。
 * 明确排除 `< > & " ' / \ ? #` 等可能参与 SVG / 路径注入的字符。
 * DiceBear 本身会转义，这里再做一层输入白名单（纵深防御）。
 */
export const AVATAR_SEED_PATTERN = /^[\p{L}\p{N} _-]+$/u

/** 校验头像种子，非法时返回错误说明，合法返回 null。 */
export function avatarSeedError(seed: string): string | null {
  if (seed.length === 0) return '头像种子不能为空'
  if (seed.length > AVATAR_SEED_MAX) return `头像种子不能超过 ${AVATAR_SEED_MAX} 字`
  if (!AVATAR_SEED_PATTERN.test(seed)) {
    return '头像种子只能包含文字、数字、空格、连字符与下划线'
  }
  return null
}

const BY_SLUG = new Map(AVATAR_STYLES.map((style) => [style.slug, style]))

/** 风格是否在白名单内。 */
export function findAvatarStyle(slug: string): AvatarStyle | undefined {
  return BY_SLUG.get(slug)
}

/** 全部风格 slug，供测试与前端选择器校验。 */
export const AVATAR_STYLE_SLUGS: readonly string[] = AVATAR_STYLES.map((style) => style.slug)
