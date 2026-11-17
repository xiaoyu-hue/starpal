// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * slug → DiceBear 风格对象（namespace）的映射表。
 *
 * 每个风格包导出 { create, meta, schema }，整体作为 `createAvatar(style, options)`
 * 的第一个参数。刻意用静态 import：TypeScript 能在编译期发现包名拼写错误，
 * 且构建工具可分析依赖。映射键与 config/avatar-styles.ts 的 slug 一一对应，
 * 测试会断言两边集合完全一致。
 */
import * as adventurer from '@dicebear/adventurer'
import * as adventurerNeutral from '@dicebear/adventurer-neutral'
import * as avataaars from '@dicebear/avataaars'
import * as avataaarsNeutral from '@dicebear/avataaars-neutral'
import * as bigEars from '@dicebear/big-ears'
import * as bigEarsNeutral from '@dicebear/big-ears-neutral'
import * as bigSmile from '@dicebear/big-smile'
import * as bottts from '@dicebear/bottts'
import * as botttsNeutral from '@dicebear/bottts-neutral'
import * as croodles from '@dicebear/croodles'
import * as croodlesNeutral from '@dicebear/croodles-neutral'
import * as dylan from '@dicebear/dylan'
import * as funEmoji from '@dicebear/fun-emoji'
import * as glass from '@dicebear/glass'
import * as icons from '@dicebear/icons'
import * as identicon from '@dicebear/identicon'
import * as initials from '@dicebear/initials'
import * as lorelei from '@dicebear/lorelei'
import * as loreleiNeutral from '@dicebear/lorelei-neutral'
import * as micah from '@dicebear/micah'
import * as miniavs from '@dicebear/miniavs'
import * as notionists from '@dicebear/notionists'
import * as notionistsNeutral from '@dicebear/notionists-neutral'
import * as openPeeps from '@dicebear/open-peeps'
import * as personas from '@dicebear/personas'
import * as pixelArt from '@dicebear/pixel-art'
import * as pixelArtNeutral from '@dicebear/pixel-art-neutral'
import * as rings from '@dicebear/rings'
import * as shapes from '@dicebear/shapes'
import * as thumbs from '@dicebear/thumbs'
import * as toonHead from '@dicebear/toon-head'
import type { Style } from '@dicebear/core'

export const AVATAR_STYLE_OBJECTS: Readonly<Record<string, Style<Record<string, unknown>>>> = {
  adventurer,
  'adventurer-neutral': adventurerNeutral,
  avataaars,
  'avataaars-neutral': avataaarsNeutral,
  'big-ears': bigEars,
  'big-ears-neutral': bigEarsNeutral,
  'big-smile': bigSmile,
  bottts,
  'bottts-neutral': botttsNeutral,
  croodles,
  'croodles-neutral': croodlesNeutral,
  dylan,
  'fun-emoji': funEmoji,
  glass,
  icons,
  identicon,
  initials,
  lorelei,
  'lorelei-neutral': loreleiNeutral,
  micah,
  miniavs,
  notionists,
  'notionists-neutral': notionistsNeutral,
  'open-peeps': openPeeps,
  personas,
  'pixel-art': pixelArt,
  'pixel-art-neutral': pixelArtNeutral,
  rings,
  shapes,
  thumbs,
  'toon-head': toonHead,
}
