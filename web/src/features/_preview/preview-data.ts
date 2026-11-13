/** 预览页静态数据。示例内容统一标注「示例」，不冒充真实用户或真实内容。 */

export type Swatch = { name: string; token: string }

export const COLOR_GROUPS: Array<{ title: string; swatches: Swatch[] }> = [
  {
    title: '背景与表面',
    swatches: [
      { name: 'canvas', token: '--sp-bg' },
      { name: 'subtle', token: '--sp-bg-subtle' },
      { name: 'surface', token: '--sp-surface' },
      { name: 'raised', token: '--sp-surface-raised' },
    ],
  },
  {
    title: '品牌与文本',
    swatches: [
      { name: 'accent', token: '--sp-accent' },
      { name: 'accent-soft', token: '--sp-accent-soft' },
      { name: 'ink', token: '--sp-text' },
      { name: 'muted', token: '--sp-text-muted' },
    ],
  },
  {
    title: '边框与状态',
    swatches: [
      { name: 'line', token: '--sp-border' },
      { name: 'line-strong', token: '--sp-border-strong' },
      { name: 'danger', token: '--sp-danger' },
      { name: 'success', token: '--sp-success' },
    ],
  },
]

export const TYPE_SCALE = [
  { name: '3xl · 36px', className: 'text-3xl' },
  { name: '2xl · 28px', className: 'text-2xl' },
  { name: 'xl · 22px', className: 'text-xl' },
  { name: 'lg · 18px', className: 'text-lg' },
  { name: 'base · 15px', className: 'text-base' },
  { name: 'sm · 14px', className: 'text-sm' },
  { name: 'xs · 12px', className: 'text-xs' },
]

export const SPACING = [
  { name: 'space-1', token: '--sp-space-1' },
  { name: 'space-2', token: '--sp-space-2' },
  { name: 'space-3', token: '--sp-space-3' },
  { name: 'space-4', token: '--sp-space-4' },
  { name: 'space-5', token: '--sp-space-5' },
  { name: 'space-6', token: '--sp-space-6' },
]

export const RADII = [
  { name: 'sm · 8', token: '--sp-radius-sm' },
  { name: 'md · 12', token: '--sp-radius-md' },
  { name: 'lg · 16', token: '--sp-radius-lg' },
]

export const SAMPLE_POST = {
  author: '示例内容',
  time: '示例 · 非真实用户',
  topic: '设计与技术',
  title: '让兴趣相遇，让热爱聚集',
  excerpt:
    '这是一段用于检验排版、行高与中英文混排可读性的示例文字。STARPAL 使用统一的字号阶梯与克制的间距，让长文也能保持舒适阅读；内容卡片保持实色，不与玻璃层混用。',
  likes: 0,
  comments: 0,
}
