# 第三方组件与依赖许可声明

版权所有 © 2026 xiaoyu-hue（GitHub: [@xiaoyu-hue](https://github.com/xiaoyu-hue)）

本项目（STARPAL 星聚）**自有代码**以 **AGPL-3.0-or-later** 授权，**文档**以 **CC BY-NC-SA 4.0** 授权。

本文件登记项目所使用**第三方组件与开发依赖**的许可证。所有第三方组件**保持其原有开源许可证**，本项目不对其重新授权。分发本项目时须遵守下列各组件的许可证条款（尤其是保留版权声明、随附 NOTICE 等义务）。

## 直接依赖

| 组件 | 版本(声明) | 许可证 |
| --- | --- | --- |
| `@radix-ui/react-dialog` | 1.3.1 | MIT |
| `@radix-ui/react-dropdown-menu` | 2.2.1 | MIT |
| `@radix-ui/react-tabs` | 1.2.1 | MIT |
| `@tanstack/react-query` | 5.107.1 | MIT |
| `@testing-library/jest-dom` | ^7.0.1 | MIT |
| `@testing-library/react` | ^16.3.3 | MIT |
| `@testing-library/user-event` | ^14.6.12 | MIT |
| `@types/express` | 5.0.6 | MIT |
| `@types/node` | 22.20.5 | MIT |
| `@types/pg` | 8.23.1 | MIT |
| `@types/react` | 19.3.0 | MIT |
| `@types/react-dom` | 19.3.0 | MIT |
| `@vitejs/plugin-react` | 6.3.0 | MIT |
| `@vitest/coverage-v8` | ^5.1.0 | MIT |
| `@dicebear/core` | 9.4.3 | MIT |
| `@dicebear/*`（31 个风格包） | 9.4.2 / 9.4.3¹ | MIT · (MIT AND CC-BY-4.0) · See LICENSE file² |
| `altcha` | 3.6.0 | MIT |
| `altcha-lib` | 2.8.0 | MIT |
| `autoprefixer` | 10.6.2 | MIT |
| `dotenv` | 18.0.10 | BSD-2-Clause |
| `express` | 5.3.0 | MIT |
| `hash-wasm` | ^4.13.0 | MIT |
| `jsdom` | ^29.1.1 | MIT |
| `lucide-react` | 1.72.0 | ISC |
| `pg` | 8.23.1 | MIT |
| `postcss` | 8.5.32 | MIT |
| `react` | 19.3.1 | MIT |
| `react-dom` | 19.3.1 | MIT |
| `react-router-dom` | 7.18.5 | MIT |
| `tailwindcss` | 3.4.19 | MIT |
| `tsx` | 4.23.15 | MIT |
| `typescript` | 5.9.3 | Apache-2.0 |
| `vite` | 8.3.8 | MIT |
| `vitest` | ^5.1.0 | MIT |

## 传递依赖许可证分布

| 许可证 | 数量 |
| --- | --- |
| MIT | 347 |
| Apache-2.0 | 21 |
| ISC | 15 |
| (MIT AND CC-BY-4.0) | 13 |
| MPL-2.0 | 12 |
| LGPL-3.0-or-later | 10 |
| BSD-2-Clause | 3 |
| Apache-2.0 AND LGPL-3.0-or-later | 3 |
| MIT-0 | 2 |
| BSD-3-Clause | 2 |
| Apache-2.0 AND LGPL-3.0-or-later AND MIT | 1 |
| CC-BY-4.0 | 1 |
| BlueOak-1.0.0 | 1 |
| CC0-1.0 | 1 |
| 0BSD | 1 |
| See LICENSE file | 4 |
| UNKNOWN（无 `license` 字段） | 25 |
| AGPL-3.0-or-later（本项目自身） | 1 |

> 上表由 `package-lock.json` 的 `license` 字段实测统计，随依赖变动更新。
> 完整、逐包的传递依赖清单（含版本）请见仓库根目录的 `package-lock.json`。
> `UNKNOWN` / `See LICENSE file` 的包以各自随附的 LICENSE 文件为准，不臆测其许可。

## 许可证兼容性说明

- 除下表标注为 `UNKNOWN` / `See LICENSE file` 的包（以其随附 LICENSE 为准，未逐条核验）外，其余直接与传递依赖均为宽松或弱传染许可（**MIT / MIT-0 / ISC / Apache-2.0 / BSD-2-Clause / BSD-3-Clause / 0BSD / MPL-2.0 / LGPL-3.0 / CC-BY-4.0 / CC0-1.0 / BlueOak-1.0.0** 及其组合），均可与 AGPL-3.0 组合，无强传染（GPL 类）依赖。此处为依赖清单层面的核对，**不构成法律意见或安全审计结论**。
- **MIT / ISC / BSD**：分发时须保留原版权声明与许可文本。
- **Apache-2.0**：分发时须随附其 `NOTICE`（如有）并保留版权声明。
- **MPL-2.0**：对 MPL 文件的修改须以 MPL 公开，可与其他许可代码组合。
- **CC-BY-4.0 / (MIT AND CC-BY-4.0)**：图案作品要求署名。DiceBear 头像风格中标注 CC BY 的部分，站内已在「头像署名」页（`/avatar-credits`）逐条列出作品作者、许可与来源链接；代码部分为 MIT，与 AGPL 无冲突。
- ¹ `@dicebear/initials` 使用 9.4.3（修复 GHSA-gcr2-9v8m-gq45 SVG 注入漏洞），其余风格包为 9.4.2；两者均为兼容的 9.x 系列，`core` 为 9.4.3。
- ² `avataaars` / `avataaars-neutral` / `bottts` / `bottts-neutral` 的包清单写 `See LICENSE file`，按其随附许可为免费商用；署名信息以 DiceBear 官网 styles 页为准。
- 依赖安装后 `npm audit` 为 **0 漏洞**（上述漏洞已通过版本选择与逐个安装规避，未使用会锁定易受攻击版本的聚合包 `@dicebear/collection`）。

---

> 本文件由脚本根据 `package.json` 与 `node_modules` 生成；依赖变动后请重新生成。
