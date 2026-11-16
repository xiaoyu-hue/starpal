// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 前端测试全局准备。
 *
 * 两件事，都只做一次：
 * 1. 挂上 jest-dom 的断言扩展（toBeInTheDocument 等），让断言读起来像人话。
 * 2. 显式注册 cleanup。`@testing-library/react` 的自动清理依赖全局 `afterEach`，
 *    而本仓库刻意不开 vitest globals，所以必须手动注册——否则组件会跨用例残留，
 *    出现「上一个用例的节点还在文档里」这种假通过。
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
