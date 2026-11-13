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
| `@types/express` | 5.0.6 | MIT |
| `@types/node` | 22.20.5 | MIT |
| `@types/pg` | 8.23.1 | MIT |
| `@types/react` | 19.3.0 | MIT |
| `@types/react-dom` | 19.3.0 | MIT |
| `@vitejs/plugin-react` | 6.3.0 | MIT |
| `autoprefixer` | 10.6.2 | MIT |
| `dotenv` | 18.0.10 | BSD-2-Clause |
| `express` | 5.3.0 | MIT |
| `hash-wasm` | ^4.13.0 | MIT |
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

## 传递依赖许可证分布

| 许可证 | 数量 |
| --- | --- |
| MIT | 213 |
| ISC | 14 |
| Apache-2.0 | 5 |
| MPL-2.0 | 3 |
| BSD-3-Clause | 2 |
| CC-BY-4.0 | 1 |
| BSD-2-Clause | 1 |
| 0BSD | 1 |

> 完整、逐包的传递依赖清单（含版本）请见仓库根目录的 `package-lock.json`。

## 许可证兼容性说明

- 上述直接与传递依赖均为 **MIT / ISC / Apache-2.0 / BSD-2-Clause / BSD-3-Clause / 0BSD / MPL-2.0 / CC-BY-4.0** 等宽松或弱传染许可，**均可与 AGPL-3.0 组合**，无冲突。
- **MIT / ISC / BSD**：分发时须保留原版权声明与许可文本。
- **Apache-2.0**：分发时须随附其 `NOTICE`（如有）并保留版权声明。
- **MPL-2.0**：对 MPL 文件的修改须以 MPL 公开，可与其他许可代码组合。

---

> 本文件由脚本根据 `package.json` 与 `node_modules` 生成；依赖变动后请重新生成。
