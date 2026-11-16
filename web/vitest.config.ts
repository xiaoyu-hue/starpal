// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 前端测试配置（`M7` 第一批）。
 *
 * 为什么不把 `test` 字段写进 `vite.config.ts`：
 * 生产构建不该依赖测试框架。独立配置让 `npm run build` 与 `npm test` 的依赖边界
 * 保持清晰——构建产物里不会因为引入测试配置而牵连 `vitest` 的类型。
 *
 * `__APP_VERSION__` 由 Vite 构建注入，测试环境同样需要，否则引用它的组件会抛
 * 「__APP_VERSION__ is not defined」。这里与 `vite.config.ts` 取同一个真源
 * （根 `package.json` 的 version），不另写一个假版本号。
 */
import { createRequire } from 'node:module'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const { version } = createRequire(import.meta.url)('../package.json') as { version: string }

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    environment: 'jsdom',
    // 不用 globals：显式从 'vitest' 导入 describe / it / expect，
    // 避免为了几个全局变量去改 tsconfig 的 types，IDE 也能准确跳转。
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      /**
       * 覆盖率口径只统计「这一轮真正测到的层」。
       *
       * 把 `src/features/**` 里尚未测的页面也算进来，只会把总数稀释成一个
       * 毫无指导意义的百分比；等组件测试那一批落地后再逐个把目录加进来。
       * 门槛值取实测值向下留 5 个点，作用是防倒退，不是催人刷数字。
       */
      include: ['src/lib/**/*.ts'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
})
