// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Config } from 'tailwindcss'

// 所有取值均来自 web/src/styles/tokens.css 的 CSS 变量，令牌为唯一来源。
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--sp-bg)',
        subtle: 'var(--sp-bg-subtle)',
        surface: 'var(--sp-surface)',
        raised: 'var(--sp-surface-raised)',
        ink: 'var(--sp-text)',
        muted: 'var(--sp-text-muted)',
        faint: 'var(--sp-text-subtle)',
        accent: 'var(--sp-accent)',
        'accent-hover': 'var(--sp-accent-hover)',
        'accent-soft': 'var(--sp-accent-soft)',
        'on-accent': 'var(--sp-on-accent)',
        line: 'var(--sp-border)',
        'line-strong': 'var(--sp-border-strong)',
      },
      fontFamily: {
        sans: 'var(--sp-font-sans)',
      },
      fontSize: {
        xs: 'var(--sp-text-xs)',
        sm: 'var(--sp-text-sm)',
        base: 'var(--sp-text-base)',
        lg: 'var(--sp-text-lg)',
        xl: 'var(--sp-text-xl)',
        '2xl': 'var(--sp-text-2xl)',
        '3xl': 'var(--sp-text-3xl)',
      },
      borderRadius: {
        sm: 'var(--sp-radius-sm)',
        md: 'var(--sp-radius-md)',
        lg: 'var(--sp-radius-lg)',
      },
      boxShadow: {
        sm: 'var(--sp-shadow-sm)',
        md: 'var(--sp-shadow-md)',
      },
    },
  },
  plugins: [],
} satisfies Config
