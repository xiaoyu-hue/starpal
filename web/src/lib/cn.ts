// SPDX-License-Identifier: AGPL-3.0-or-later
/** 拼接条件类名，保持组件样式可读；不引入额外依赖。 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
