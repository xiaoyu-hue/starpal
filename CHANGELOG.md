# 变更记录

本文件记录项目的重要变更，格式遵循 [Keep a Changelog](https://keepachangelog.com/)。版本号遵循语义化版本约定。所有条目使用过去时态描述已发生的变更；计划中的工作只在 `[Unreleased]` 中列出，不计为已交付。

## [Unreleased]

## [1.0.1] - 2026-11-14

### 许可

- 自有代码采用 **AGPL-3.0-or-later**，新增 `LICENSE`（GNU AGPL v3 官方全文）。
- 文档采用 **CC BY-NC-SA 4.0**，新增 `LICENSE-docs`（含许可摘要、条款与官方链接）。
- 新增 `THIRD-PARTY-NOTICES.md`，登记第三方直接依赖及其许可证（全部 MIT / ISC / Apache-2.0 / BSD-2-Clause / BSD-3-Clause / 0BSD / MPL-2.0 / CC-BY-4.0，与 AGPL-3.0 兼容）。
- 根、`server/`、`web/` 三个 `package.json` 增加 `license` 字段；重写 README「许可与第三方」段。
- 版本号 `1.0.0 → 1.0.1`（属文档/管理类改动，按语义化版本规则走修订号）。

## [1.0.0] - 2026-11-14

> 首个正式版本，对应 PRD / 架构 / 实施计划 / 部署指南 v1.0 基线（**架构基线**）。包含 `M1` 与 `M2` 的全部交付内容，并经 DoD-01 质量门（类型检查 + 构建 + 体积 + lint）校验通过。

### 发布说明

- **架构基线**：冻结 v1.0 产品范围——18 张数据表、16 个后端业务模块、REST 端点清单、ADR-001—013 架构决策。
- **M1 可运行空壳**：前后端工程骨架、设计系统与响应式外壳、信息流外壳（三态）、PostgreSQL 迁移机制、Express 单进程静态托管、说明页后端单源（`/api/meta/*`）。
- **M2 账户与资料**：注册 / 登录 / 登出与会话、受保护路由与角色守卫、个人资料与设置（含账号注销与彻底擦除）、隐私 / 社区准则 / 关于三说明页、DoD-01 质量门（模块导入边界 lint、`seed`、`export:check`）。
- **部署**：Vercel + Neon 免费层（免信用卡）改造，自定义域名 `starpal.cc.cd`，自动 HTTPS。
- **版本号**：`package.json` 与后端 `APP_VERSION` 自 `0.1.0` 提升为 `1.0.0`，作为后续迭代的架构基线。

### 规格基线

- 建立 PRD、系统架构设计、实施计划与部署配置指南四份基线文档。
- 冻结 v1.0 范围：18 张数据表、16 个后端业务模块、REST 端点清单、18 项验收标准。
- 登记 `ADR-001`—`ADR-013` 架构决策及放弃的备选方案。
- 定义里程碑 `M1`—`M7`、阶段与任务编号体系、完成判据与验证记录模板。

### Added

- 建立 `web/` 前端工程骨架（Vite + React + TypeScript），以 `.nvmrc` 与 `engines.node` 锁定 Node 22。
- 落地设计令牌（`tokens.css`）与全局样式，提供浅深两套主题及单一玻璃容器。
- 落地星聚品牌标识（中心主星 + 环绕小星）与 favicon，使用 `currentColor` 适配两套主题。
- 落地基础组件库：按钮、输入、卡片、徽标、头像、对话框、下拉菜单、标签页、骨架屏、三态反馈。
- 新增设计系统预览页，用于在全站铺开前确认视觉基线（`M1-S3-T8`）。
- 新增 `.env.example` 变量名占位与文件体积检查脚本（`.ts/.tsx` ≤ 300 行、`.css` ≤ 400 行）。
- 落地 `server/` 后端骨架：环境变量启动校验、连接池与事务封装、幂等迁移执行器、`001_roles_users.sql`（`roles` / `users` 及约束）。
- 落地统一响应与错误包络、请求标识 / 安全响应头 / 访问日志 / 请求体限制 / 集中错误处理中间件链。
- 落地 `GET /api/health`、`GET /api/meta/guidelines`、`GET /api/posts` 三个只读端点；信息流在无业务数据时返回真实空页，不填充演示内容。
- 落地 Express 单进程托管前端构建产物与 SPA 深层路由回退（`M1-S5-T6`）。
- 落地应用外壳：路由表与懒加载边界、主题与请求缓存 Provider、顶栏、左右栏、移动端四项 Tab 与中央凸起发布按钮、平板抽屉。
- 落地信息流外壳：API 客户端、请求缓存配置、游标去重、三 Tab、帖子卡片结构、骨架屏、错误态、引导式空态、`role="feed"` 语义与键盘导航。
- 新增 `scripts/build-standalone.mjs`，生成可脱离服务打开的自包含预览 HTML（单分包 + 内联资源）。
- 新增 `scripts/dev.mjs`，以 Node 内置能力并行启动前后端开发进程，不引入额外依赖。
- 新增 `scripts/copy-migrations.mjs` 与 `migrate:prod` 脚本，使编译产物可独立执行数据库迁移。
- 新增 `docs/DEPLOYMENT.md` §17 托管平台部署契约（Render + Neon 免费层），含构建 / 启动命令、环境变量、免费层限制与自定义域名流程。
- 新增 `docs/DEPLOYMENT.md` §18 Vercel + Neon 免费层部署契约（无信用卡方案）；因 Render 自 2026 年起免费层强制绑卡，本项目改用 Vercel。
- 新增 `server/src/api-app.ts`（仅 API 的 Express 装配）与 `api/index.ts`（Vercel Serverless Function 入口），将后端从常驻 Express 进程改造为 Vercel 无服务器函数；新增 `vercel.json`（API 显式转发、SPA 回退重写、`functions.includeFiles`）。
- 更新 `README.md` 与 `docs/DEPLOYMENT.md` 说明托管平台由 Render 切换为 Vercel 及对应架构变化。
- 新增 `002_profiles_sessions.sql`：`user_profiles`、`sessions`、`security_events` 三表及四个索引，已在真实 Neon 事务内试跑回滚验证后正式应用（账本至 `002`）。
- 新增认证域 `server/src/modules/auth/`：注册 / 登录 / 登出 / 当前会话四个端点（`POST /api/auth/register|login|logout`、`GET /api/auth/me`），完成 `M2-S1` 数据基座与 `M2-S2` 账户闭环（后端）。
- 新增 `hash-wasm@4.13.0` 依赖：以纯 WebAssembly 实现 Argon2id 密码哈希（OWASP 首选算法），零原生编译模块，规避 Vercel Serverless 对 bcrypt / argon2 原生依赖不保证可用的问题；参数（64 MiB / 3 轮 / 并行 1）随 PHC 编码串存储，可平滑升级。
- 新增校验原语 `shared/validation.ts`、会话 Cookie 层 `session.ts`、来源不可逆摘要 `subject.ts`、落库限流 `rate-limit.ts`、认证仓储与服务层。
- 新增分层防刷：邀请码恒定时间比较、应用速率限制、登录失败限次、蜜罐字段、来源 HMAC 摘要与按期清理；所有计数落于 `security_events` 而非进程内存（Serverless 多实例要求）。
- 新增认证常量（`config/constants.ts`）：用户名 / 密码 / 显示名准入规则、Argon2id 参数、会话与蜜罐字段。
- 新增前端认证域 `web/src/features/auth/`（`M2-S2-T6`）：登录 / 注册页面与共用表单、邀请码输入、错误展示、登录后跳转、当前会话状态与顶栏登录态切换；`/login` 与 `/register` 不再使用占位页。表单具备语义标签、`aria-invalid` / `aria-describedby` 错误关联、`role="alert"` 错误区、`role="status"` 成功提示、密码管理器 `autocomplete` 提示与对读屏／键盘隐藏的蜜罐字段，不引入任何新依赖。线上真实浏览器 15 项验证全部通过（含浅深主题与 390px 移动端截图核验），测试账号与安全事件已按时间窗精确清理。
- 新增 `web/src/lib/api-client.ts` 的 `apiPost()`，GET / POST 共用同一套响应解包与错误归一化；无请求体的 POST 不发送 `Content-Type`，与后端 `body-limit` 修复对齐。
- 新增 `M2-S3` 受保护路由与角色基座：路由级 `require-auth.ts` / `require-role.ts`（复用既有 401 / 403 错误码，未新增表、依赖或错误码）；`modules/admin/` 管理路由组一次性统一挂载认证与角色校验，当前仅 `GET /api/admin/whoami` 回显调用者自身身份，作为 `AC-11` 前置与 `M6` 后台挂载骨架。
- 新增 `scripts/init-admin.mjs` 与根命令 `init:admin`：从环境变量读取凭据、复用编译产物中的 Argon2id 哈希与准入常量，幂等创建初始管理员（同名已存在则不改密码、不改角色），显式 `--reset` 才重置密码并撤销该账号全部会话；不打印密码、哈希或堆栈。`.env.example` 补 `ADMIN_DISPLAY_NAME` 与「不要把密码写命令行」提示。
- 新增前端路由守卫 `web/src/app/guards.tsx`（`RequireAuth`）：`/settings` 未登录跳登录页并带提示与原目标，登录成功后按站内路径白名单回跳，权限判定仍以后端为准；守卫放在 `app/` 并从具体文件导入，避免破坏认证页的懒加载分包。
- 线上受保护路由与前端守卫闭环 20/20 验证通过（部署 `dpl_BHj22nX47agTLPYrR8c9jcvv2hyd`）：访客 401 / 普通用户 403 / 管理员 200、角色变更即时生效、客户端声明角色无效、伪造前端 admin 状态仍无法越权、`/settings` 守卫跳转与回跳；测试账号与本次安全事件按时间窗精确清理，生产库 `users` / `sessions` 归零。
- 新增 `M2-S4` 个人资料后端域 `server/src/modules/users/`：`GET /api/users/:username` 公开投影（仅 `username/displayName/avatarUrl/biography/createdAt/postCount/optional`，剔除 `password_hash/role/status/session`；`status='suspended'` 返回 404 不可枚举）、`GET /api/users/:username/posts` 占位（帖子在 `M3` 落地）、`/api/users/me` 组（`GET` 当前资料、`PATCH` 资料编辑、`DELETE` 软删除、`POST /erase` 彻底擦除），全部经 `requireAuth` 守卫。
- 新增隐私投影常量与软删除署名（`config/constants.ts`）：`BIOGRAPHY_MAX=300`、`AVATAR_URL_MAX=2048`、星座 / MBTI / 年龄段枚举、`DELETED_DISPLAY_NAME='已注销用户'`；`ADR-010` 软删除——注销后显示名署「已注销用户」、可选资料与头像清空、会话撤销、用户名随机化（擦除时）并记入 `account_erase` 安全事件。
- 新增校验原语 `requireBoolean` / `requireHttpUrl`（仅 http/https、长度受限）于 `shared/validation.ts`，用于资料编辑的入参校验。
- 新增可选资料字段（`user_profiles`）：`avatar_url / biography / zodiac / mbti / age_band / show_optional`，与账户核心分离；`show_optional` 默认 `false`，未公开时他方页面 `optional:null`、不采集生日。
- 新增前端资料域 `web/src/features/profile/`：`ProfilePage`（公开个人页：头像、显示名、`@用户名`、简介、注册日期、可选资料徽标、帖子空态与页脚说明链接）、`SettingsPage` + `SettingsSections`（资料编辑、主题选择 light/dark/system、关于与检查更新、账号注销与彻底擦除二次确认）、`queries.ts`（`usePublicProfileQuery` / `useUserPostsQuery` / `useOwnProfileQuery`）、`api.ts`（`fetchPublicProfile` / `fetchOwnProfile` / `updateOwnProfile` / `deleteOwnAccount` / `eraseOwnAccount`）。
- 新增 `apiPatch()` / `apiDelete()` 于 `web/src/lib/api-client.ts`；`Avatar` 支持 `src` 头像链接并带首字母兜底；主题扩展为 `light/dark/system`，`system` 经 `matchMedia` 监听即时切换且刷新后保持；类型层回填 `avatarUrl` 与资料相关接口。
- 路由层接入资料域：懒加载 `ProfilePage`（`/u/:username`）与 `SettingsPage`（`/settings`，`RequireAuth` 包裹），替代原占位页；`/privacy`、`/guidelines`、`/about` 仍为待办占位（`M2-S5`）。
- 生产部署 `dpl_BcrdQmkfwWfS3DseNjVPMUk1omtu`：`READY` / `target=production` / `PROMOTED`，`gitSource.sha=89bf4b6ec145b0f7286ee5a085cfdf18e739a413`，域名 `starpal.cc.cd` 与 `starpal.vercel.app` 均 `verified`；对生产 API 实跑 M2-S4 在线验证 26 项全过，测试账号 0 残留。
- 新增 `M2-S5` 说明页面（隐私 / 社区准则 / 关于）后端单源：`config/constants.ts` 新增 `PRIVACY`（分节文案，对齐 M2-S4 真实实现：采集范围、Neon 存储、保留期、注销软删除 / 彻底擦除）、`SITE_NAME`、`SITE_LAUNCH_DATE`；`modules/meta/` 增加 `privacyController` / `aboutController`，`routes.ts` 挂载 `GET /api/meta/privacy`、`/api/meta/about`；准则继续复用既有 `/api/meta/guidelines`。
- 新增前端 `web/src/features/_static/`：通用排版壳 `StaticPage` / `Section`、三页 `PrivacyPage` / `GuidelinesPage` / `AboutPage`、`meta.api.ts`（拉取三接口）+ `meta.queries.ts`（React Query）；`router.tsx` 以懒加载替换 `/privacy`、`/guidelines`、`/about` 三处占位；准则页文本与后端接口逐字一致，关于页版本号与建站日期读自后端（单一来源）。
- 生产部署 `dpl_BdMqm33R5k3J2phU2vTSRv8o6RV`：承接 M2-S5 推送，对生产实跑在线验证 27 项全过（三页面可达、文案与接口一致、不泄露私有字段），测试账号 0 残留。
- 补齐 `DoD-01` 欠账：新增 `scripts/lint.mjs`（零依赖静态检查，硬规则含模块导入边界、web 设计令牌字面量、导入扩展名一致性，软规则仅告警导入排序），修复两处真实模块越界（新增 `modules/auth/index.ts` barrel、`features/profile` 改经 `features/auth` barrel、主题色改从 CSS 变量读取）；新增 `scripts/seed.mjs`（幂等示例账号播种）与 `scripts/export-check.mjs`（导出隐私边界校验 + 自测）；`package.json` 增加 `lint/seed/export:check` 并将 `lint` 接入 `verify`。
- 生产部署 `dpl_E49ZZBFsHzzwGMFX4hUZzp5oHAEr`：承接 DoD-01 推送，`READY` / `target=production` / `PROMOTED`，`gitSource.sha=cce2285e62…`；`npm run verify`（typecheck + build + size + lint）全过，`M2` 里程碑完成判据全部满足。

### Fixed

- 修正配置加载以工作目录为基准导致 npm workspace 下 `.env` 与相对路径解析错位的问题。
- 修正离线预览在 `file://` 协议下被误判为未知路由的问题：离线时改用内存路由并固定落在首页。
- 修正自包含预览生成时 Tailwind `content` 相对路径解析错误、以及外部资源残留检测误报。
- 修正桌面顶栏缺失「发布」主操作、左栏导航项未左对齐的问题。
- 修正生产环境静态资源目录定位：改为以模块位置定位仓库根，不再依赖 `.env` 是否存在或工作目录，避免 npm workspace 下解析为 `server/server/public` 导致静态资源 404。
- 修正编译产物缺失 SQL 迁移文件导致生产迁移执行器读不到迁移的问题，并新增不依赖 `tsx` 的生产迁移命令。
- 修正 Vercel 函数入口：收敛为 `api/index.ts` 并以 `/api/:path* → /api` 显式转发覆盖任意层级 `/api/*/*`；函数顶层改为零运行时依赖（仅 `import type`），Express 装配与迁移放入 handler 内动态 `import()` 并整体包进 `try/catch`，消除黑盒 `FUNCTION_INVOCATION_FAILED`。线上 `https://starpal.cc.cd/api/health` 实测 200、`database: up`。
- 修正 SPA 回退 rewrite 正则为 `/((?!api).*)`，避免裸 `/api` 被重写到 `index.html`；并把它排在更具体的 `/api/:path*` 之后。
- 修正函数编译产物引用路径为 `server/dist/**`（此前误指向不存在的 `server/src/*.js`），并用 `includeFiles` 显式打入整个编译产物目录。
- 修正迁移目录定位：改为多候选路径探测，不再写死 `import.meta.url` 相邻目录，兼容打包后 `import.meta.url` 指向产物的 Vercel lambda。
- 修正 `body-limit` 中间件将「无请求体的 POST」（如登出）误判为 `415` 的问题：仅当写方法确实携带请求体时才强制 `application/json`，否则放行。
- 统一 `package-lock.json` 中 294 个明文 npm 镜像地址为官方 HTTPS 源，消除供应链隐患；以 `npm ci --include=dev` 复验通过。
- 修正账户不存在时登录耗时差异：以固定 Argon2id 哈希执行等价运算，抹平时序侧信道。
- 修正多段 `/api/*/*` 请求（如 `/api/auth/me`、`/api/meta/guidelines`）被 Vercel 平台原生 404 拦截、未进入 Express 的问题：根因是文件系统优先于 rewrites 且 catch-all 函数路由未覆盖多段路径，改为单一函数入口 + 显式转发（`docs/DEPLOYMENT.md` §18.12）。线上 12 项端到端复测全部通过，测试账号与本次安全事件已按时间窗精确清理，生产库未残留。

### 待实现（按里程碑）

| 里程碑 | 计划内容 |
| --- | --- |
| `M1` | 已实现 `M1-S1`—`M1-S5`；`AC-13`（移动端布局）与 `AC-14`（视觉一致）已有验证记录，其余验收项按里程碑推进 |
| `M2` | ✅ 已完成 `M2-S1`—`M2-S5`（`M2-S5` 说明页后端单源 + 线上验证 `VR-M2-22~24`）；`DoD-01` 的 lint / 导入边界规则（`scripts/lint.mjs`）与 `seed` / `export:check` 脚本均已补齐并验证（`VR-M2-25~26`），`init:admin` 已交付；`AC-01/02/03/10/18` 与 `DoD-01`—`DoD-10` 全部满足，里程碑完成判据齐备 |
| `M3` | 帖子、图片上传、话题分类、详情页 |
| `M4` | 点赞、收藏、评论、通知 |
| `M5` | 私信、成就、搜索、数据导出 |
| `M6` | 管理后台、举报、内容审核、权限校验 |
| `M7` | 测试加固、部署文档、全量验收 |

> 上表为计划，不代表已实现。每一项在对应里程碑的验证记录齐备后，方可从本表移除并写入「已添加」。

---

## 版本约定

| 类型 | 说明 |
| --- | --- |
| `Added` | 新增功能或文档 |
| `Changed` | 既有行为的变更 |
| `Deprecated` | 即将移除的能力 |
| `Removed` | 已移除的能力 |
| `Fixed` | 缺陷修复 |
| `Security` | 安全相关变更 |

### 变更同步要求

- 代码与 `README.md`、本文件、`docs/` 下相关文档须同一次提交内更新。
- 涉及表结构的变更须登记迁移文件编号。
- 涉及接口契约的变更须登记端点清单变更。
- 涉及架构取向的变更须登记 ADR 编号。
- 验收结论以验证记录为准，未执行的验证项标记为「未验证」。
