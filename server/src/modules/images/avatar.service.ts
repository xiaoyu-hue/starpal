// SPDX-License-Identifier: AGPL-3.0-or-later
import { createAvatar } from '@dicebear/core'
import { DomainError } from '../../shared/errors.js'
import { AVATAR_STYLES, avatarSeedError } from '../../config/avatar-styles.js'
import { AVATAR_STYLE_OBJECTS } from './avatar-generators.js'

/** 生成头像的 SVG 字符串。风格与种子都先校验，非法输入抛领域错误。 */
export function generateAvatarSvg(styleSlug: string, seed: string): string {
  const style = AVATAR_STYLES.find((item) => item.slug === styleSlug)
  if (style === undefined) {
    throw new DomainError('VALIDATION_FAILED', '不支持的头像风格')
  }
  const seedError = avatarSeedError(seed)
  if (seedError !== null) {
    throw new DomainError('VALIDATION_FAILED', seedError)
  }

  const styleObject = AVATAR_STYLE_OBJECTS[style.slug]
  if (styleObject === undefined) {
    // 清单与映射表不一致属于开发期缺陷，不伪装成用户输入错误。
    throw new Error(`头像风格缺少生成器: ${style.slug}`)
  }

  // 只传 seed 与固定尺寸；绝不把用户输入放进 rotate / fontSize 等历史漏洞参数。
  return createAvatar(styleObject, { seed, size: 128 }).toString()
}
