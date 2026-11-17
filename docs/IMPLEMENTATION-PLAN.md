# 星聚 STARPAL · 实施计划与里程碑

| 项目 | 内容 |
| --- | --- |
| 产品 | 星聚 STARPAL |
| 版本 | v1.0.0 |
| 文档状态 | 基线（Baseline） |
| 关联文档 | [产品需求文档](./PRD.md) · [系统架构设计](./ARCHITECTURE.md) · [部署与配置指南](./DEPLOYMENT.md) |

---

## 1. 文档说明

### 1.1 目的

将 v1.0 需求拆解为可执行的里程碑、阶段与任务，明确每一步的产出、验证方式与完成判据，作为开发、评审与验收的进度依据。

### 1.2 粒度定义

| 层级 | 编号 | 含义 |
| --- | --- | --- |
| 里程碑 | `M1` … `M7` | 一组可独立演示、可独立验证的交付单元 |
| 阶段 | `M3-S2` | 里程碑内的一组相关任务，通常对应一个模块或一条链路 |
| 任务 | `M3-S2-T4` | 最小执行单元，产出明确、可在单次提交内完成 |

任务编号在全生命周期内稳定，不复用、不重排。

### 1.3 进度基准

本计划以**顺序依赖与完成判据**为进度基准，不预设日历工期，不估算人日。里程碑只有在全部完成判据满足后方可标记为完成；不允许以「代码已写完」代替验证。

### 1.4 与需求文档的关系

| 文档 | 回答的问题 |
| --- | --- |
| [PRD.md](./PRD.md) | 做什么、做到什么程度、如何判定 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 分几层、边界在哪、契约是什么 |
| 本文 | 按什么顺序做、每步交什么、怎么验证 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 怎么配置、怎么跑、怎么备份 |

---

## 2. 计划总览

### 2.1 里程碑总表

| 里程碑 | 对应需求阶段 | 目标 | 主要交付 | 依赖 |
| --- | --- | --- | --- | --- |
| `M1` | Phase 1 | 项目骨架、设计系统、首页外壳与响应式布局 | 可运行的空壳应用 + 令牌 / 组件预览 | — |
| `M2` | Phase 2 | 注册登录、会话安全、个人资料 | 完整认证链路与资料编辑 | `M1` |
| `M3` | Phase 3 | 帖子、图片上传、话题、详情页 | 内容生产与消费闭环 | `M2` |
| `M4` | Phase 4 | 点赞、收藏、评论、通知 | 互动闭环与准确计数 | `M3` |
| `M5` | 补充 | 私信、成就、搜索、导出 | 草图补充项与辅助能力 | `M4` |
| `M5.5` | 补充 | 头衔与等级：站长授权头衔 / 经验 / `L1`–`L50` 等级 / 五段位 | 轻量成员成长与识别（每日签到经评审取消，与原签到计划冲突，见 `M5.5-S3`） | `M5` |
| `M6` | Phase 5 | 管理后台、举报（部分已交付）、审核、权限校验、审计日志 | 治理闭环 | `M5.5` |
| `M7` | Phase 6 | 测试、错误与性能加固、部署文档、验收 | 可交付版本与完整验证记录 | `M6` |

> `M5` 承载草图与需求文档合并后追加的能力（私信、成就时间线、每周热门、搜索、导出），插入互动与治理之间，使治理模块可在完整数据集上验证。

### 2.2 依赖顺序

```mermaid
flowchart LR
    M1["M1 骨架与设计系统"] --> M2["M2 认证与账户"]
    M2 --> M3["M3 内容与话题"]
    M3 --> M4["M4 互动"]
    M4 --> M5["M5 私信 / 成就 / 辅助"]
    M4 -.->|"前端组件可并行"| M5
    M5 --> M55["M5.5 头衔系统"]
    M55 --> M6["M6 治理"]
    M6 --> M7["M7 测试与交付"]
    DOC["文档同步 / 验证记录"] -.-> M1
    DOC -.-> M7
```

### 2.3 关键路径

`M1 设计系统 → M2 会话与权限基座 → M3 帖子与图片管线 → M4 互动事务 → M5 辅助能力 → M5.5 头衔系统 → M6 角色校验与审核日志 → M7 验收`

关键路径上的任一阶段未完成，后续里程碑不得标记为完成。`M5` 中的私信与导出可与 `M4` 的交互前端部分并行，但数据迁移须串行执行。

### 2.4 并行与顺序约束

| 可并行 | 必须串行 |
| --- | --- |
| 前端组件预览 与 后端骨架 | 迁移文件执行顺序 |
| 前端 UI 骨架 与 API 实现（以契约为界） | 会话中间件 → 受保护路由 → 角色校验 |
| `M5` 私信前端 与 `M4` 互动前端 | 帖子表 → 图片表 → 互动表 |
| 文档撰写 与 代码实现 | 种子数据 → 演示内容标注 → 空态验证 |
| 测试用例编写 与 功能实现 | 功能冻结 → 回归 → 验收记录归档 |

---

## 3. 通用工程规范

### 3.1 每步交付物

每个任务须同时具备三类产出，缺一不视为完成：

| 类别 | 内容 |
| --- | --- |
| 代码 | 可构建、类型检查通过、符合目录与依赖方向约束 |
| 文档 | 本文状态列、`README`、必要时 `CHANGELOG` 与契约文档同步 |
| 验证记录 | 一条实际执行的检查记录，含命令与真实输出 |

### 3.2 验证记录模板

验证列描述的是**待执行的检查**，本计划不预填结果。实际执行后填入下表（可按里程碑分表维护）：

| 编号 | 里程碑 | 验证项 | 执行命令 / 操作 | 期望 | 实际输出 | 结论 | 执行时间 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `V-001` | `M1` | 示例占位 | 待填 | 待填 | 未执行 | 未验证 | — |

结论只允许填写：`通过` / `未通过` / `未验证`。未执行项一律标记为 `未验证`，不得以推定结论代替。

### 3.3 完成判据（DoD，适用于每个里程碑）

| 编号 | 判据 |
| --- | --- |
| `DoD-01` | 前端构建通过、类型检查通过、lint 通过（含导入边界规则） |
| `DoD-02` | 后端构建通过、类型检查通过；进程可启动且健康检查返回可用 |
| `DoD-03` | 本里程碑涉及的迁移可在空库上完整执行，且重复执行不产生重复结构 |
| `DoD-04` | 本里程碑涉及的 API 冒烟检查通过，错误响应符合统一包络 |
| `DoD-05` | 相关页面具备加载 / 错误 / 空三态，权限判定在服务端生效 |
| `DoD-06` | 新增或修改的契约已同步至 `ARCHITECTURE.md` 与类型定义 |
| `DoD-07` | `README` 与 `CHANGELOG` 已同步；本文里程碑状态已更新 |
| `DoD-08` | 验证记录齐全，未执行项已标注为「未验证」 |
| `DoD-09` | 仓库扫描确认无真实凭据、密钥、邀请码或口令明文 |
| `DoD-10` | 未引入 `ARCHITECTURE.md §2.3` 非目标清单中的能力 |

### 3.4 标准脚本契约

以下脚本名作为项目契约，具体实现以各包 `package.json` 为准：

| 脚本 | 作用 |
| --- | --- |
| `dev` | 启动前端开发服务器 / 后端 API 进程 |
| `build` | 前端产出静态文件、后端编译 |
| `start` | 单进程启动，托管静态资源与 API |
| `migrate` | 执行未应用的数据库迁移 |
| `seed` | 写入演示话题与示例帖（可选执行） |
| `lint` | 静态检查，含模块导入边界 |
| `typecheck` | 类型检查 |
| `test` | 单元与 API 集成测试 |
| `test:e2e` | 端到端检查 |
| `export:check` | 校验导出文件可读性 |
| `init:admin` | 一次性创建初始管理员 |

### 3.5 配置与密钥规范

- 所有配置经环境变量注入；`config/env.ts` 启动即校验，缺失则启动失败。
- 仓库只保留 `.env.example` 的变量名占位，不含任何真实值。
- 初始管理员凭据、邀请码、会话密钥由部署方在环境中设置，脚本不打印凭据。
- 涉及凭据的实现须在验证记录中附加「仓库扫描」检查结果。

### 3.6 变更控制

| 变更类型 | 处理 |
| --- | --- |
| 需求增删 | 更新 PRD 编号与追踪矩阵，追加 ADR |
| 表结构变更 | 新增迁移文件，不修改已执行迁移 |
| 接口变更 | 更新 `ARCHITECTURE.md §6.2` 与类型定义，前后端同步 |
| 依赖新增 | 记录用途、被排除的替代方案与影响范围 |
| 视觉令牌变更 | 更新令牌文件与组件预览页，全站回归 |

### 3.7 不可逆操作清单（须单独审批）

| 操作 | 说明 |
| --- | --- |
| 公开部署与域名绑定 | 使实例对外可达，须在收尾阶段单独决策 |
| 外部账号注册与服务开通 | 涉及服务条款与身份核验 |
| 生产数据清除、账号擦除 | 影响持久化数据，不可撤销 |
| 覆盖既有代码或迁移 | 破坏已有实现与结构一致性 |
| 启用任何付费服务 | 违反零付费第三方服务约束 |

`M1`—`M7` 的实现、迁移与本地验证均不属于不可逆操作。

---

## 4. 里程碑明细

> 各表「产出」列中的路径相对于仓库根目录；「验证」列中的命令为待执行检查，结果填入验证记录表。

---

### M1 · 项目骨架、设计系统与响应式外壳

**目标**：交付一套可运行的空壳应用，视觉基线统一，桌面与移动端布局到位，为后续模块提供稳定底座。

**前置条件**：Node.js 22 LTS、npm、可连接的 PostgreSQL 实例、本地可写上传目录。

#### `M1-S1` 项目初始化与契约冻结

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M1-S1-T1` | 建立仓库结构 | 创建 `web/`、`server/`、`docs/`、`scripts/` 与根级文件；配置 `.gitignore`（含 `uploads/`、`public/`、`.env`、`node_modules/`） | 目录树 | 目录结构与 `ARCHITECTURE.md §14` 一致 |
| `M1-S1-T2` | 锁定运行时 | 写入 `.nvmrc`（22）、各包 `engines.node` 声明 | `.nvmrc`、`package.json` | `node -v` 与锁定版本一致 |
| `M1-S1-T3` | 建立脚本契约 | 在两端 `package.json` 定义 §3.4 脚本名 | `package.json` | 逐个执行脚本入口，确认无缺失 |
| `M1-S1-T4` | 环境变量骨架 | 建立 `config/env.ts` 启动校验与 `.env.example` 占位 | `server/src/config/env.ts`、`.env.example` | 缺失必需变量时进程启动失败 |
| `M1-S1-T5` | 冻结契约 | 将 PRD 需求编号、架构端点清单、表清单登记为基线 | `docs/` 三份基线文档 | 编号可交叉检索，无孤儿编号 |
| `M1-S1-T6` | 文档骨架 | 建立 `README.md` 与 `CHANGELOG.md` 初始结构 | 根级文档 | 链接可跳转，无失效引用 |

#### `M1-S2` 数据库连接与迁移机制

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M1-S2-T1` | 连接池 | 实现 `db/pool.ts`，参数来自环境变量，启动校验连接 | `server/src/db/pool.ts` | 健康检查接口返回数据库可用 |
| `M1-S2-T2` | 迁移执行器 | 实现 `db/migrate.ts`，按序执行、事务包裹、写入 `schema_migrations` | `server/src/db/migrate.ts` | 空库执行成功，重复执行无重复结构 |
| `M1-S2-T3` | 基础迁移 | 建立 `001_roles_users.sql`（`roles` / `users` 及约束） | `migrations/001_*.sql` | 查询表结构与架构 §7.3 一致 |
| `M1-S2-T4` | 迁移回滚说明 | 为每个迁移补充回滚影响说明 | 迁移文件注释 / 文档 | 说明与实际结构一致 |

#### `M1-S3` 设计系统与令牌

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M1-S3-T1` | 令牌定义 | 在 `styles/tokens.css` 定义浅深两套颜色、字号、间距、圆角、玻璃与阴影变量 | `web/src/styles/tokens.css` | 切换 `data-theme` 后变量取值变化 |
| `M1-S3-T2` | 令牌接入 | Tailwind 配置引用同一 CSS 变量，形成唯一来源 | `web/tailwind.config.ts` | 页面不存在令牌外字面量（lint 检查） |
| `M1-S3-T3` | 全局基线 | 字体族（中英回退）、行高、焦点态、滚动基线 | `web/src/styles/globals.css` | 中英文混排渲染正常，焦点可见 |
| `M1-S3-T4` | 品牌标识 | 制作中心主星 + 环绕小星的几何标识，输出单色 / 深浅两套与 favicon | `web/public/brand/` | 缩至 favicon 尺寸仍可辨识 |
| `M1-S3-T5` | 基础组件 | 按需引入按钮、输入、对话框、下拉、骨架、提示组件源码并统一令牌 | `web/src/components/ui/` | 键盘操作与焦点管理可用 |
| `M1-S3-T6` | 玻璃容器 | 实现单一玻璃容器组件，参数为 §5.1 既定值 | `web/src/components/layout/GlassPanel.tsx` | 玻璃层内文字对比度达标 |
| `M1-S3-T7` | 三态组件 | 实现骨架屏、可重试错误态、引导式空态 | `web/src/components/feedback/` | 三态均可独立复现 |
| `M1-S3-T8` | 组件预览页 | 建立令牌 / 组件预览页，展示浅深两套与全部基础组件 | `web/src/features/_preview/` | 肉眼确认风格统一，无模板化仪表盘观感 |

#### `M1-S4` 应用外壳与导航

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M1-S4-T1` | 路由表 | 建立 `app/router.tsx` 与页面懒加载边界 | `web/src/app/router.tsx` | 全部注册路径可解析 |
| `M1-S4-T2` | Provider | 装配请求缓存与主题 Provider | `web/src/app/providers.tsx` | 主题选择刷新后保留 |
| `M1-S4-T3` | 顶栏 | 品牌标识、搜索栏占位、通知图标、头像菜单、访客入口 | `web/src/app/shell/TopBar.tsx` | 六个目的地入口存在 |
| `M1-S4-T4` | 左栏 / 右栏 | 左栏导航与话题分类、右栏热门 / 公告 / 推荐面板 | `Sidebar.tsx`、右栏组件 | ≥1280px 三栏同时可见 |
| `M1-S4-T5` | 底部 Tab | 四项 Tab + 中央凸起发布按钮，触摸目标与安全区 | `BottomTabBar.tsx` | <768px 生效，无横向溢出 |
| `M1-S4-T6` | 折叠规则 | 按 1280 / 1024 / 768 三档实现折叠，目的地集合一致 | `useMediaQuery.ts`、外壳 | 四个断点逐一检查 |

#### `M1-S5` 首页信息流外壳（无业务数据）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M1-S5-T1` | API 客户端 | 统一 `/api` 前缀、响应解包、错误归一化、凭据携带 | `web/src/lib/api-client.ts` | 错误响应被归一化为领域错误 |
| `M1-S5-T2` | 请求缓存配置 | 缓存键命名、重试、单一在途请求约束 | `web/src/lib/query-client.ts` | 快速切换不产生并发堆叠 |
| `M1-S5-T3` | 信息流骨架 | 三个 Tab、帖子卡片结构、游标分页哨兵、骨架屏 | `web/src/features/feed/` | 三态可复现，无假按钮 |
| `M1-S5-T4` | 语义与键盘 | `role="feed"` / `role="article"`、位置属性、Page Up/Down、Home/End | 同上 | 键盘导航逐条可用 |
| `M1-S5-T5` | 空态 | 「这里还没有内容，第一篇由你写下」及引导入口 | 同上 | 无数据时显示，不显示演示内容冒充 |
| `M1-S5-T6` | 静态托管 | Express 托管前端构建产物与 SPA 回退路由 | `server/src/app.ts` | 直接访问深层路径可正常加载 |

**M1 交付物**：可运行空壳、设计令牌与组件预览页、迁移执行器与首版迁移、响应式外壳、README 骨架。

**M1 完成判据**：`DoD-01`—`DoD-10` 全部满足；`AC-13`、`AC-14` 有验证记录；桌面三栏与移动底部 Tab 均可见；刷新后主题与页面状态保持。

**风险与回退**：视觉基线未确认即铺开全站会导致大规模返工，故 `M1-S3-T8` 为硬性前置；令牌变更仅影响样式层，可回退至上一版令牌文件。

**M1 验证记录（实际执行结果）**

| 编号 | 检查项 | 结论 | 依据 |
| --- | --- | --- | --- |
| `VR-M1-01` | 前端类型检查 / 生产构建 | 通过 | `npm run typecheck`、`npm run build` 真实执行，无错误 |
| `VR-M1-02` | 后端类型检查 / 编译 | 通过 | `npm run typecheck --workspace server`、`npm run build --workspace server` |
| `VR-M1-03` | 空库迁移完整执行 | 通过 | `npm run migrate` 首次应用 `001_roles_users.sql` |
| `VR-M1-04` | 迁移幂等 | 通过 | 第二次执行输出「无待应用迁移」；`schema_migrations` 仅 1 行 |
| `VR-M1-05` | 表结构与约束 | 通过 | `roles` / `users` / `schema_migrations` 三表；`users` 含主键、唯一、外键、检查四类约束 |
| `VR-M1-06` | 启动校验负例 | 通过 | 缺失 `DATABASE_URL` 时进程如期失败 |
| `VR-M1-07` | 健康检查真实查库 | 通过 | `GET /api/health` 返回 `database: "up"` 与服务端时间 |
| `VR-M1-08` | 信息流真实空态 | 通过 | `GET /api/posts?tab=latest` 返回 `data: []`、`hasMore: false` |
| `VR-M1-09` | 错误响应统一包络 | 通过 | 非法 `tab` 返回 `VALIDATION_FAILED` / 400；未知路径返回 `NOT_FOUND` / 404，均含 `requestId` |
| `VR-M1-10` | SPA 深层路由回退 | 通过 | `GET /posts/new` 返回入口 HTML（200 / text/html），静态资源 200 |
| `VR-M1-11` | 安全响应头 | 通过 | 含 `X-Content-Type-Options`、`X-Request-Id`、CSP |
| `VR-M1-12` | 四断点布局与折叠 | 通过 | CDP 精确视口 360 / 768 / 1024 / 1440：无横向溢出；底栏仅 360 可见；左栏 ≥1024 可见；右栏 ≥1280 可见 |
| `VR-M1-13` | 主题与视觉一致 | 通过 | 浅色 `rgb(250,249,247)` / 深色 `rgb(16,19,28)`，文字对比达标；逐屏截图核验 |
| `VR-M1-14` | 三态组件 | 通过 | 骨架屏、可重试错误态、引导式空态均可复现 |
| `VR-M1-15` | 文件体积预算 | 通过 | 扫描 74 个源文件，全部在 `.ts/.tsx` ≤ 300、`.css` ≤ 400 内 |
| `VR-M1-16` | 仓库无真实凭据 | 通过 | `.env` 未被跟踪；无 token 明文；密钥值仅存在于被排除的 `.env` |
| `VR-M1-17` | 非目标清单未引入 | 通过 | 未引入 Redis、消息队列、插件系统、全局状态库、图表库、动效库 |

**未验证 / 未满足项（如实登记，M1 阶段）**

- `DoD-01` 中的 **lint 与导入边界规则**已在本仓库后续阶段（M2 `VR-M2-25`）建立，M1 当时仅类型检查与体积检查。
- `AC-13` / `AC-14` 已在 `M1` 范围内验证；按映射表，`M7` 阶段仍须执行全站回归复验。
- 注册、登录、发帖、图片、互动、后台等业务验收项（`AC-01`—`AC-12`、`AC-15`—`AC-18`）**未验证**，归属后续里程碑（M2 已完成 `AC-01/02/03/10/18`）。
- `seed` / `init:admin` / `export:check` 脚本：`init:admin` 已于 M2-S3 交付，`seed` / `export:check` 已于 M2 `VR-M2-26` 补齐并验证。

---

### M2 · 认证、会话安全与个人资料

**目标**：建立完整的账户链路与服务端权限基座，全部受保护资源依赖会话判定。

**前置条件**：`M1` 完成；`001` 迁移已应用。

#### `M2-S1` 数据与安全基座

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M2-S1-T1` | 资料与会话表 | `002_profiles_sessions.sql` 建立 `user_profiles`、`sessions`、`security_events` 及索引 | `migrations/002_*.sql` | 结构与架构 §7.3 一致 |
| `M2-S1-T2` | 中间件链 | 按架构 §5.4 顺序装配请求标识、安全头、体限制、访问日志、会话、限流、错误 | `server/src/middleware/` | 链路顺序与文档一致 |
| `M2-S1-T3` | 领域错误 | 实现 `shared/errors.ts`、`response.ts`、`error-handler.ts` | `server/src/shared/` | 错误响应符合统一包络，无堆栈外泄 |
| `M2-S1-T4` | 校验原语 | 实现 `validate.ts` 与 `validation.ts`，长度 / 类型 / 枚举校验 | 同上 | 非法输入返回 `VALIDATION_FAILED` |

#### `M2-S2` 注册与登录

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M2-S2-T1` | 注册服务 | 用户名唯一性、字符集与长度、密码强度、邀请码校验、密码哈希、事务写入用户与资料 | `modules/auth/` 六件套 | 注册后查询到新行，密码字段为哈希（`AC-01`） |
| `M2-S2-T2` | 防刷分层 | 邀请码（环境变量）、速率限制、蜜罐字段、登录失败限次、来源摘要与按期清理 | `rate-limit.ts`、`security_events` | 各层独立可复现；蜜罐不误伤辅助技术 |
| `M2-S2-T3` | 登录与会话 | 凭据校验、会话写入、`HttpOnly` / `SameSite` / `Secure` Cookie | `auth.service.ts`、`session.ts` | 登录返回会话；Cookie 属性正确 |
| `M2-S2-T4` | 登出与失效 | 删除会话行，`/api/auth/me` 返回未授权 | 同上 | `AC-02` 有记录 |
| `M2-S2-T5` | 错误提示统一 | 认证失败统一响应，不区分账户存在性 | `error-handler.ts` | 两种错误返回同一提示 |
| `M2-S2-T6` | 前端认证域 | 登录 / 注册表单、邀请码输入、错误展示、登录后跳转 | `web/src/features/auth/` | 表单可访问标签齐全，错误可读 |

#### `M2-S3` 受保护路由与角色基座

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M2-S3-T1` | 认证守卫 | `require-auth.ts`，路由级挂载 | `server/src/middleware/` | 未登录直接请求 API 被拒 |
| `M2-S3-T2` | 角色守卫 | `require-role.ts`，管理路由统一挂载 | 同上 | 普通用户访问管理端点被拒（`AC-11` 前置） |
| `M2-S3-T3` | 初始管理员 | 一次性脚本结合环境变量创建管理员，不打印凭据 | `scripts/init-admin` | 仓库扫描无凭据明文（`AC-18`） |
| `M2-S3-T4` | 前端守卫 | 路由跳转仅作体验层，权限以服务端为准 | `web/src/app/router.tsx` | 手动改前端状态无法越权 |

#### `M2-S4` 个人资料

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M2-S4-T1` | 公开投影 | `GET /api/users/:username` 仅返回公开字段，不泄露内部字段 | `modules/users/` | 响应不含哈希、角色、会话、地址 |
| `M2-S4-T2` | 资料编辑 | 显示名 / 头像 / 简介更新，仅本人可操作 | 同上 | `AC-10` 有记录，越权被拒 |
| `M2-S4-T3` | 可选资料 | 星座 / MBTI / 年龄段选填，默认不公开，不采集生日 | `user_profiles` | 未公开时他方页面不可见 |
| `M2-S4-T4` | 公开个人页 | 头像、显示名、用户名、简介、注册日期、已发布帖子占位 | `web/src/features/profile/` | 页面三态完整 |
| `M2-S4-T5` | 设置页 | 资料编辑、主题选择、关于、检查更新入口 | 同上 | 入口均有落地页，主题刷新保留 |
| `M2-S4-T6` | 账号删除 | 软删除 + 署名「已注销用户」；提供彻底擦除入口 | `users` 服务 | 软删除后帖子仍可见且署名正确 |

#### `M2-S5` 说明页面

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M2-S5-T1` | 隐私说明 | 写明采集范围、存储位置、保留期、注销与删除方式 | `web/src/features/_static/privacy` | 页面可达，表述与实现一致 |
| `M2-S5-T2` | 社区准则 | 禁止行为、处置方式、申诉路径、审核责任归属 | `web/src/features/_static/guidelines` | 页面可达，`/api/meta/guidelines` 一致 |
| `M2-S5-T3` | 关于页 | 版本信息与建站日期 | 同上 | 检查更新入口给出明确状态 |

**M2 交付物**：认证链路、会话与角色中间件、防刷分层、个人资料与说明页面、初始管理员脚本。

**M2 完成判据**：`AC-01`、`AC-02`、`AC-03`、`AC-10`、`AC-18` 有验证记录；`DoD-01`—`DoD-10` 全部满足；无任何明文凭据入仓。

**风险与回退**：会话与权限是全部后续模块的基座，须在 `M3` 前冻结；若需更换会话方案，影响面限于 `session.ts` 与 `sessions` 表。

**M2 验证记录（实际执行结果，覆盖 `M2-S1`—`M2-S4`）**

| 编号 | 检查项 | 结论 | 依据 |
| --- | --- | --- | --- |
| `VR-M2-01` | 前后端类型检查与生产构建 | 通过 | `npm run verify` 实际执行；认证页生成独立分包 `AuthPage-*.js`；89 个源文件均在体积预算内 |
| `VR-M2-02` | `002` 迁移在真实 Neon 幂等应用 | 通过 | 事务内 `SAVEPOINT` 试跑回滚后正式应用；账本 `001` / `002`，三表与四个索引齐全 |
| `VR-M2-03` | 注册产生真实记录且密码为哈希（`AC-01`） | 通过 | 本地与线上端到端；库中 `password_hash` 为 `$argon2id$` 前缀 |
| `VR-M2-04` | 密码不以明文存储（`AC-03`） | 通过 | 同上；访问日志不记录凭据 |
| `VR-M2-05` | 登录 / 登出可用，登出后未授权（`AC-02`） | 通过 | 本地 12 项、线上 12 项、浏览器 15 项均通过 |
| `VR-M2-06` | 错误响应统一包络 / 认证失败不区分账户存在性 | 通过 | 账户不存在与密码错误返回同一提示；账户不存在时以固定 Argon2id 哈希执行等价运算 |
| `VR-M2-07` | 邀请码、唯一性、蜜罐三层防刷可复现 | 通过 | 错误邀请码 `INVITE_INVALID`、重复用户名 `CONFLICT`、蜜罐返回形状一致的假用户；速率上限与登录失败限次未单独压测 |
| `VR-M2-08` | `M2-S2-T6` 前端认证域可访问性与闭环 | 通过 | 真实 Chromium 线上 15 项：语义标签、`autocomplete` 区分、蜜罐隐藏、空表单本地校验、错误态清除、错误邀请码、注册跳转、`role="status"`、错误密码、登录、顶栏切换、退出、刷新失效、无脚本错误；浅色 / 深色 / 390px 截图核验 |
| `VR-M2-09` | 生产库无测试数据残留 | 通过 | 每次验证后按时间窗精确清理；`users=0`、`sessions=0`，账本未改动 |
| `VR-M2-10` | `M2-S3` 认证 / 角色守卫三态与无回归 | 通过（本地） | 本地 HTTP 服务连真实 Neon 9 项：访客 401、普通用户 403、管理员 200、角色变更后同一 Cookie 下一次请求即生效、登出后 401；`/api/health` 200 与业务 404 包络无回归 |
| `VR-M2-11` | 初始管理员脚本幂等与凭据安全 | 通过（本地） | 真实 Neon 12 项：创建 admin、Argon2id 哈希、`user_profiles` 同步、输出不含密码 / 哈希、重复执行不改哈希、`--reset` 换哈希并清空会话且不改角色、缺变量明确报错 |
| `VR-M2-12` | `AC-18` 全仓库明文凭据扫描 | 通过（仓库口径） | 以 GitHub `zipball/main` 下载远程真实仓库快照（不依赖滞后的本地 git 索引）；推送前基线 118 个文本文件 0 命中；推送后首次复扫 124 个文本文件命中 1 处，为部署教程中文示例值被正则误判，已改为 `<...>` 占位符；最终复扫（提交 `7c7e241b4285` 后）124 个文本文件 0 命中 → `AC-18` 通过。本地 `.env` 命中 3 处已被 `.gitignore` 排除且未入仓，登记为工作区残留风险 |
| `VR-M2-13` | 线上受保护路由与前端守卫闭环 | 通过 | 部署 `dpl_BHj22nX47agTLPYrR8c9jcvv2hyd`：HTTP 12 项 + 真实 Chromium 7 项 + 清理 1 项，合计 20/20；含访客 401 / 普通用户 403 / 管理员 200、角色变更即时生效、客户端声明角色无效、伪造前端 admin 状态仍 403、`/settings` 守卫跳转与回跳、顶栏已登录态、无脚本错误；测试账号与安全事件已精确清理 |
| `VR-M2-14` | 公开投影隐私（`M2-S4-T1`） | 通过 | 生产 `GET /api/users/:username` 返回 `data.profile`，仅含 `username/displayName/avatarUrl/biography/createdAt/postCount/optional`；断言不含 `password_hash/role/status/session` 等私有键；`status='suspended'` 账户返回 404 不可枚举 |
| `VR-M2-15` | 资料编辑（`M2-S4-T2` / `AC-10`） | 通过 | 生产 `PATCH /api/users/me` 更新显示名 / 头像 / 简介 / 星座 / MBTI / 年龄段 / `showOptional`，公开投影即时反映；非法枚举值 `VALIDATION_FAILED`、非 http(s) 头像 `400`；仅本人可改（`requireAuth` 守卫） |
| `VR-M2-16` | 可选资料门控（`M2-S4-T3`） | 通过 | `showOptional=false` 时公开投影 `optional:null`（简介仍可见）；`true` 时 `optional` 含 `zodiac/mbti/ageBand`；不采集生日，仅以年龄段呈现 |
| `VR-M2-17` | 公开个人页与设置页入口（`M2-S4-T4/T5`） | 通过 | 生产 `GET /` 与深层路由 `/u/:username` 均 200 且回退 SPA（含 `<div id="root">`）；`/settings` 由 `RequireAuth` 守卫；主题扩展 `light/dark/system`，`system` 经 `matchMedia` 监听即时切换并在刷新后保持 |
| `VR-M2-18` | 账号软删除（`M2-S4-T6` / `ADR-010`） | 通过 | 生产 `DELETE /api/users/me` 后状态置 `deleted`、显示名改为「已注销用户」、资料与头像清空、会话撤销；原会话 Cookie 随后请求 `401`；公开投影正确署名「已注销用户」 |
| `VR-M2-19` | 彻底擦除（`M2-S4-T6`） | 通过 | 生产 `POST /api/users/me/erase` 在软删除基础上随机化用户名（原用户名 404 不可枚举）、记入 `account_erase` 安全事件、撤销全部会话；显示名仍署「已注销用户」 |
| `VR-M2-20` | 生产部署与线上全量验证 | 通过 | Vercel 部署 `dpl_BcrdQmkfwWfS3DseNjVPMUk1omtu`：`READY` / `target=production` / `PROMOTED`，`gitSource.sha=89bf4b6ec…`，域名 `starpal.cc.cd` 与 `starpal.vercel.app` 均 `verified`；对生产 API 实跑 26 项检查全过，测试账户 0 残留 |
| `VR-M2-21` | 生产库无测试数据残留（`M2-S4` 轮次） | 通过 | 每轮验证后按 `username LIKE 'm2s4_online_%'` 精确清理；清理后计数 `0`，账本 `001/002` 未改动，无测试帖子 / 会话遗留 |
| `VR-M2-22` | 说明页后端单源与接口（`M2-S5`） | 通过 | 生产 `GET /api/meta/guidelines`、`/api/meta/privacy`、`/api/meta/about` 均 200；`guidelines` 4 条含「不收集手机号」；`privacy` 6 节含「我们采集的信息 / 我们不采集的信息 / 信息存储位置 / 注销与删除」且正文提及 Neon / Argon2id / 已注销用户 / 彻底擦除；`about` 返回 `version=0.1.0`、`launchDate=2026-11-12`、`siteName=星聚 STARPAL` |
| `VR-M2-23` | 三说明页渲染与文案一致性（`M2-S5`） | 通过 | 真实 Chromium 加载生产 SPA：隐私页含全部 6 节标题与「Neon / 已注销用户 / 彻底擦除 / 0.1.0」；准则页逐条渲染 4 条准则 + 「申诉与审核」+ 版本；关于页显示「星聚 STARPAL / 当前版本 0.1.0 / 建站于 2026-11-12 / 暂无更新通道」；准则页文本与 `/api/meta/guidelines` 接口逐字一致 |
| `VR-M2-24` | 说明页不泄露私有字段（`M2-S5`） | 通过 | `meta` 三接口响应经正则复核，不含 `password_hash/role/status/session` 等用户私有字段；页面仅展示站点级只读文案，不触达任何账户数据 |
| `VR-M2-25` | `DoD-01` lint 与导入边界规则 | 通过 | 新增 `scripts/lint.mjs`（零依赖，贴合 `scripts/*.mjs` 质量门约定）：硬规则①模块导入边界（`server/src/modules/*` 与 `web/src/features/*` 不得穿透其他模块内部，仅可经 `index` barrel）②web 设计令牌字面量（不得硬编码 `#hex/rgb/hsl`，排除 `tailwind.config.ts`、`tokens.css`、`theme.ts`）③导入扩展名一致性（`server` 须 `.js`、`web` 不得带扩展名）；软规则为导入排序（仅告警）。实跑 `npm run lint` 硬规则 0 违规；并修复两处真实越界（`modules/users` 经 `modules/auth/index.js` 引用 `clearSessionCookie`；`features/profile` 三文件改经 `features/auth` barrel 引用 `AuthProvider`），`theme.ts` 主题色改从 CSS 变量读取 |
| `VR-M2-26` | `seed` / `export:check` 脚本 | 通过 | 新增 `scripts/seed.mjs`（幂等示例账号播种，识别 M3 内容表）与 `scripts/export-check.mjs`（导出隐私边界校验 + 自测）；实跑验证：对生产 Neon 成功创建并随后清理示例账号（`username LIKE 'starpal_demo'`，0 残留）；`export:check` 自测样例确认「合法导出通过、含他用户 `password_hash` 越界导出被拦截」；`package.json` 已增 `lint/seed/export:check` 并将 `lint` 接入 `verify` |
| `VR-M2-27` | `M2` 全量完成与最终部署 | 通过 | Vercel 部署 `dpl_E49ZZBFsHzzwGMFX4hUZzp5oHAEr`：`READY` / `target=production` / `PROMOTED`，`gitSource.sha=cce2285e62…`，域名 `starpal.cc.cd` 与 `starpal.vercel.app` 均 `verified`；`npm run verify`（typecheck + build + size + lint）全过；`AC-01/02/03/10/18` 与 `DoD-01`—`DoD-10` 现已齐备，`M2` 里程碑完成判据全部满足 |

**M2 里程碑状态：✅ 已完成**。说明：工作区 `.env` 残留风险仍由部署方处置（凭据不入仓，见 `VR-M2-12`）；`DoD-01` 的 lint/导入边界规则与 `seed`/`export:check` 脚本**已补齐并验证**（`VR-M2-25~26`），此前登记为欠账的项已全部结清；`M2-S5` 说明页面已实现并线上验证通过（`VR-M2-22~24`）。`AC-01/02/03/10/18` 与 `DoD-01`—`DoD-10` 全部满足，里程碑可进入 `M3`。

#### M3 验证记录

| 编号 | 验证项 | 结果 | 证据 |
| --- | --- | --- | --- |
| `VR-M3-01` | 内容数据模型（`M3-S1`） | 通过 | 迁移 `003`/`004` 在生产 Neon 执行成功，`schema_migrations` = 001..004；四张新表存在；`topics` 写入 9 行且 slug 唯一。隔离环境（WASM Postgres）实跑迁移，9 条检查约束的负向用例（非法 slug / 空标题 / 非法状态 / 负计数 / 删除状态不一致 / 非法 mime / 非法 storage_key / 重复 sort_order）全部被拒；`BYTEA` 读写与级联删除正常 |
| `VR-M3-02` | 图片存储方案（`ADR-014`） | 通过 | 架构 §8 按 `postgres-bytea` 重写并新增 §8.4 迁移触发条件（图片总量 > 500 MB）；PRD / 部署指南 / 实施计划移除 `UPLOAD_DIR`，单图上限 5 MB → 3 MB、请求体 6 MB → 4 MB——须低于 Vercel 函数请求体 4.5 MB 的平台硬上限，否则应用校验不会执行 |
| `VR-M3-03` | 三 Tab 排序可解释性（`M3-S2-T5`） | 通过 | 生产库造数实测（测毕全部物理清理）：`latest` = B,C,A（时间倒序）；`popular` = C,B（A 超出 7 天窗口被排除）；`recommended` = B,C,A（加权综合分）。三 Tab 结果不同且符合 PRD §4.2 定义 |
| `VR-M3-04` | 游标分页与去重（`FR-FEED-04/05`） | 通过 | `latest` 以 `limit=2` 连续取两页，拼接得 (2,3,1)，无重复、无跳项；`hasMore` 首页 `true`、次页 `false` |
| `VR-M3-05` | 可见性与越权（`M3-S2-T3/T4`） | 通过 | 匿名读详情 `isAuthor=false`；非作者编辑返回 `FORBIDDEN`；软删除后详情返回 `NOT_FOUND` 且不再出现在信息流；`removed` 仅管理员可见，其余按不存在处理 |
| `VR-M3-06` | HTTP 层校验与包络 | 通过 | `tab` 缺省默认 `latest`；`tab` 非法 / `limit` 越界 / `limit` 非数字 / `cursor` 非法 / `topic` 非法（含超长）均 400 且带字段级约束；`/posts/abc` 与不存在 ID 均 404；未登录 `POST` / `PATCH` / `DELETE` 均 401 |
| `VR-M3-07` | 演示数据策略（`AC-17` 前置） | 通过 | 生产库不播种任何演示内容；验证用临时账号与帖子在 `finally` 中物理删除，复核残留 `posts=0`、`users` 恢复为原有 2 个 |
| `VR-M3-08` | 质量门 | 通过 | `npm run verify` 全绿（typecheck + build + size + lint），`lint` 硬规则 0 违规，源文件均在体积预算内 |
| `VR-M3-09` | 话题目录 API（`M3-S4-T1` 读侧） | 通过 | 本地 PostgreSQL 16 实例跑迁移后 `GET /api/topics` 返回 9 个内置话题，含 `id/slug/nameZh/nameEn/description/icon/sortOrder/postCount`；发帖后对应话题 `postCount` 由 0 变 1，与信息流可见性口径一致（同一 `WHERE` 条件推导） |
| `VR-M3-10` | 前端内容域（`M3-S5`） | 通过 | 真实 Chromium 走完整用户路径：登录 → 信息流 20 条 → 话题页 9 个 → 话题详情标题「游戏」→ 界面发帖（标题 / 单选话题 / 多行正文）→ 跳转 `/posts/28` → 详情标题与正文段落空行保留、编辑入口可见、同话题相关区块出现；浏览器控制台无脚本错误（仅 1 条 `/api/auth/me` 未登录时的 401，属预期探测） |
| `VR-M3-11` | 自然语言字段校验缺陷修复 | 通过 | 修复前 `title` / `body` / `displayName` / `biography` 共用「禁止内部空白」规则，导致含空格的标题与多行正文被 `400` 拒绝（`{"field":"title","constraint":"不得包含空白字符"}`）；改为对四类自然语言字段显式 `allowInnerWhitespace`，`username` / `inviteCode` 仍禁空白。修复后含空格标题、含 `\n\n` 正文均正常创建且换行在详情页保留 |
| `VR-M3-12` | 游标翻页一致性（补测） | 通过 | 25 条内容 `limit=20`：首页 20 条 `hasMore=true`，次页 5 条 `hasMore=false`，两页 ID 集合无交集、整体严格递减；个人页 `?cursor=bad-cursor` 返回 `400`（不静默回退第一页，避免无限滚动死循环） |
| `VR-M3-13` | 存储适配器（`M3-S3-T1`） | 通过 | 本地 PostgreSQL 16 空库迁移后，用真实 PNG 走 `withTransaction` 写入：事务内先插 `post_images` 再 `put` 字节，提交后经适配器读回**字节完全一致**（SHA-256 相同）、`mimeType` 正确；`byteSize` 与实际字节数相等；未知键返回 `null`；同键重复写入被主键拒绝（内容不可变）；畸形键（`../../etc/passwd`）在适配器层即返回 `null`，不触达数据库。真实尺寸样本 704.5 KB：事务写入 19 ms、读取 6 ms |
| `VR-M3-17` | 生产环境真实上传（`M3-S3` 全链路） | 通过 | 部署后在 `starpal.cc.cd` 用临时账号真实上传 1200×900 JPEG：返回 `image/webp`、`900×1200`（方向已校正）、7968 字节，证明 `sharp` 在 Vercel 函数内实际执行了重编码而非仅加载成功；读回 200 且 `Content-Type=image/webp`。**同时暴露一处真实缺陷**：删除图片后旧 URL 仍被 CDN 以一年缓存返回 200，加查询串绕开缓存键后才是 `404`。已将缓存头改为 `max-age=3600`，复验为 `public, max-age=3600`。验证结束后临时账号与帖子已物理清理（users 3→2、posts 1→0、`post_images` / `image_blobs` 均 0） |
| `VR-M3-18` | 移动端导航与品牌标识 | 通过 | 真实 Chromium 在 320 / 360 / 390 / 412 四档视口复测：`scrollWidth` 均等于视口宽度（无横向溢出）；顶栏「星聚」四档均可见，`STARPAL` 副标仍在 ≥ 640 px 出现；最窄 320 px 下品牌区与右侧操作区仍余 16 px。抽屉菜单顶部渲染星形标志 + 「星聚 STARPAL」，`aria-labelledby` 继续指向 `sr-only` 的「导航」，读屏播报不变；导航项 `justify-content` 计算值由 `center` 变为 `flex-start`，与桌面侧栏一致。`npm run verify` 全绿 |
| `VR-M3-19` | 版本号显示与一致性 | 通过 | 设置页「关于」的版本号改由构建期注入后显示 `1.1.0`，与 `GET /api/health` 的 `version` 一致（此前硬编码 `0.1.0`，自 `v1.0.0` 起即脱节）。`scripts/lint.mjs` 新增硬规则 `R4` 并做反向验证：把 `APP_VERSION` 临时改为 `1.0.9` 后 `lint` 失败并逐项报出四处取值，恢复 `1.1.0` 后通过 |
| `VR-M3-16` | 图片前端与渲染（`M3-S3-T6/T7`） | 通过 | 本地 PostgreSQL 16 空库迁移后接口层 24 项断言全通过：上传两张后详情 `images` 为对象数组（含 `id` / `width` / `height`）、按 `sort_order` 升序，列表接口形状一致；读取 200 且 `Content-Type=image/webp`、字节为真 WebP；删除越权 `403`、未登录 `401`、不存在 `404`、非法 id `400`；作者删除 200 后详情剩 1 张、被删图 404、另一张仍 200；删除后追加仍 201（`MAX(sort_order)+1` 不与空位冲突）；`post_images=2` / `image_blobs=2` / 缺字节 0。真实 Chromium：发帖页选两张图（预览 2 张）→ 发布自动跳详情 → 两张图 `naturalWidth` 分别 900 / 300 → 编辑页显示 2 张、点叉后剩 1 张 → 首页卡片封面加载成功（alt 为「标题 配图」）→ 移动端 390 px 无横向溢出；控制台 0 错误 |
| `VR-M3-15` | 上传管线（`M3-S3-T2/T3/T4`） | 通过 | 本地 PostgreSQL 16 空库迁移后 20 项断言全通过：带 EXIF + `Orientation=6` 的 1200×900 JPEG 上传得 201，重编码为 WebP 且尺寸变为 900×1200（方向已校正）、读回 `exif=false`；透明 PNG 正常；WebP 作为输入可再上传。负向：文本伪装 `.jpg` 与 SVG 均 `415`、3.6 MB 单文件 `413`、字段名错误 `400`、未登录 `401`、他人帖子 `403`、不存在帖子 `404`、第 10 张 `409`。事务一致性：`post_images=9` / `image_blobs=9` / 缺字节元数据 0。并发 3 张同帖上传后排序位为 0–5 连续无重复（事务级 advisory lock 生效） |
| `VR-M3-14` | 受控读取路由（`M3-S3-T5`） | 通过 | `GET /api/images/:key` 返回 `200`，响应头 `Content-Type: image/png`、`Content-Length: 164`、`Cache-Control: public, max-age=31536000, immutable`（后续调整为 `max-age=3600`，见 `VR-M3-17`）、`X-Content-Type-Options: nosniff`、`Content-Disposition: inline`；下载字节与源文件 SHA-256 一致。负向：未知键、路径穿越（`..%2F..%2Fetc%2Fpasswd`）、大写短键均 `404`，包络为 `{"error":{"code":"NOT_FOUND",...}}`，不泄露键是否存在。700 KB 图单次 6–8 ms，10 并发全部 `200`（最慢 40 ms）。`remove` 后读回 `null`，元数据行保留（符合「只删字节」语义） |

**M3 进度**：`M3-S1`（数据模型）、`M3-S2`（帖子 API）、`M3-S3`（图片上传，含前端选图与渲染）、`M3-S4`（话题域，读侧）与 `M3-S5`（前端内容域）✅ 完成，并随 **`v1.1.0`** 发布。用户现可在浏览器里完成「浏览信息流 → 挑话题 → 写正文 → 选图 → 发布 → 看详情 → 编辑 / 删图 / 删除」全流程，图片经服务端校验真实类型、重编码为 WebP 并剥离 EXIF/GPS。M3 仅剩 `M3-S4` 的写侧（管理端话题增删改与 `moderation_logs` 留痕），按计划随管理后台一并交付。帖子列表能力已并入 `modules/posts`，原 `modules/feed` 退役——同一 URL 前缀由同一模块拥有，避免游标规则与可见性判定分处两地。话题目录（`GET /api/topics`）由 `modules/topics` 提供，仅含读侧；管理端增删改与留痕随 `moderation_logs` 一并延后。

---

### M3 · 帖子、图片上传、话题与详情页

**目标**：打通内容生产与消费闭环，帖子与图片真实持久化，话题筛选生效。

**前置条件**：`M2` 完成；会话与角色守卫可用。

#### `M3-S1` 内容数据模型（✅ 已完成）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M3-S1-T1` | 话题与帖子表 | `003_topics_posts.sql` 建立 `topics`、`posts` 及四类索引、检查约束 | `migrations/003_*.sql` | 索引与架构 §7.4 一致 |
| `M3-S1-T2` | 图片表 | `004_post_images.sql` 建立 `post_images` 与 `image_blobs` | `migrations/004_*.sql` | 外键级联与排序唯一约束正确 |
| `M3-S1-T3` | 内置话题 | 九个分类（slug / 中文名 / 英文名 / 描述）随 `003` 结构迁移写入，属产品内置分类而非演示数据（`is_demo=false`、`created_by=NULL`） | `migrations/003_*.sql` | 查询得到九行且 slug 唯一 |
| `M3-S1-T4` | 演示帖子 | **决定不播种**：生产库不写入任何示例内容，避免演示数据掩盖真实空态（`AC-17`）；需要本地验收时按需手工插入并显式标注 `is_demo` | — | 生产 `posts` 表无演示行 |

#### `M3-S2` 帖子 API（✅ 已完成）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M3-S2-T1` | 帖子六件套 | 建立 `modules/posts/` 的 routes / controller / service / repository / schema / types（仓储按写入与列表拆为 `post.repository` / `post.feed.repository`，投影共用 `post.projection`） | `server/src/modules/posts/` | 层间无越界调用；单文件 ≤ 300 行 |
| `M3-S2-T2` | 创建 | 标题 / 正文 / 话题校验，服务端生成 `excerpt`，事务写入 | 同上 | `AC-04` 有记录 |
| `M3-S2-T3` | 详情与可见性 | `GET /api/posts/:id` 校验状态与删除标记 | 同上 | 已移除 / 已删除帖子不可公开访问 |
| `M3-S2-T4` | 编辑与删除 | 作者 / 管理员判定在服务层，软删除 | 同上 | 越权请求被拒 |
| `M3-S2-T5` | 信息流 | `GET /api/posts` 实现三 Tab 排序、游标分页、按 ID 去重 | `shared/pagination.ts`、posts 仓储 | 权重集中配置，翻页无重复（见 `VR-M3-03/04`） |
| `M3-S2-T6` | 相关帖子 | 同话题近期帖子，限量返回 | posts 仓储 | 结果仅含同话题 |
| `M3-S2-T7` | 路由挂载 | 在 `routes.ts` 注册 `/api/posts`；读端点挂 `optionalAuth`（匿名可读、登录者可见草稿），写端点挂 `requireAuth` | `server/src/routes.ts`、`middleware/optional-auth.ts` | 端点清单与架构 §6.2 一致 |

#### `M3-S3` 图片上传管线（✅ 已完成，含前端选图与渲染）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M3-S3-T1` | 存储接口 | ✅ `StorageAdapter`（`put` / `get` / `remove`）与 `postgres-bytea` 实现（`ADR-014`），单例注入点集中于 `storage/index.ts`；实现接受 `Pool \| PoolClient`，可参与调用方事务 | `server/src/storage/` | `VR-M3-13` 有记录；仅一个实现，无工厂 / 注册机制 |
| `M3-S3-T2` | 上传中间件 | ✅ multer 内存缓冲（不落盘）、`fileSize` 显式上限 3 MB、`files: 1`、`fields: 0`；`bodyLimit` 放行 multipart 并兜总请求体 4 MB；multer 错误翻译为 `413` / `400` 统一包络 | `middleware/upload.ts`、`middleware/body-limit.ts` | `VR-M3-15` 有记录：超限 413、字段名错误 400 |
| `M3-S3-T3` | 管线校验 | ✅ 魔术字节判真类型 + 白名单（含 SVG 拒绝）、`sharp` 解码结果交叉校验、`rotate()` 校正方向、统一重编码 WebP、剥离全部元数据、`limitInputPixels` 防解压炸弹、超限降质重试一次 | `storage/image-pipeline.ts` | `AC-06` 达成：伪造类型 415、EXIF 实测为空 |
| `M3-S3-T4` | 元数据入库 | ✅ `withTransaction` 内写 `post_images` 与 `image_blobs`，共用同一连接；`pg_advisory_xact_lock` 串行分配排序位；单帖上限 9 张 | `modules/uploads/` | `VR-M3-15`：9 行元数据对应 9 行字节，零孤儿 |
| `M3-S3-T5` | 受控读取 | ✅ `GET /api/images/:key` 经适配器取字节；`Content-Type` 取自落库值；携带 `Cache-Control: immutable` 与 `X-Content-Type-Options: nosniff`；畸形键不触达数据库。字节存于数据库，无静态目录暴露面 | `modules/images/` | `VR-M3-14` 有记录：响应头、字节一致性、404 语义逐项验证 |
| `M3-S3-T6` | 前端上传 | ✅ 选图（多选、类型与单张体积即时校验、本地预览、移除）、新建帖「先建帖后逐张上传」并从按钮回报进度、部分失败跳详情提示并可去编辑页补传；编辑页选中即上传、点叉即删除，明确标注「即时生效」 | `web/src/features/posts/components/ImagePicker.tsx`、`pages/ComposePage.tsx`、`pages/EditPostPage.tsx` | `VR-M3-16`：界面选两张图发布后详情两张自然尺寸加载完成；移动端横向溢出 0 px |
| `M3-S3-T7` | 渲染优化 | ✅ 服务端投影下发 `width` / `height`，前端按收敛后的宽高比（0.75–1.91）预留占位框；`loading="lazy"` + `decoding="async"`；`alt` 为「标题 配图 N」；单图限高 560 px、卡片封面限高 420 px，避免长图撑满屏 | `server/src/modules/posts/post.projection.ts`、`web/src/components/content/PostImages.tsx` | `VR-M3-16`：图片加载前后正文位置不移动 | 

#### `M3-S4` 话题域（⚠ 读侧完成）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M3-S4-T1` | 话题 API | ✅ 读侧：`GET /api/topics` 列表含可见帖数；⏳ 待做：单话题详情端点、管理端增删改（管理员） | `modules/topics/` | `AC-09` 有记录（读侧已验，写侧未做） |
| `M3-S4-T2` | 发现页 | ◐ **部分完成**（2026-11-15，`M5-S2` 修订）：`/discover` 已替换占位页，内容是「本周热门（只排帖子）」+ 全部话题入口（`lg` 以下显示，宽屏由左栏「话题分类」承担），全部话题完整视图仍在 `/topics`。**未做**：PRD `FR-TOPIC-02` 的热门话题视图与最新话题视图——当前话题按 `sort_order` 列出，没有热度和时间排序 | `web/src/features/discover/` | 已上线部分有真实数据与空态；三视图未齐 |
| `M3-S4-T3` | 话题详情 | ✅ 描述 + 筛选后的真实帖子流（三 Tab 可切换）；⏳ 待做：每周热门入口占位 | `web/src/features/topics/` | 筛选结果仅含该话题 |
| `M3-S4-T4` | 管理动作留痕 | ⏳ 待做：话题变更写入 `moderation_logs` | `moderation` 服务（预留调用） | 日志行生成 |

#### `M3-S5` 前端内容域（✅ 已完成）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M3-S5-T1` | 创建 / 编辑页 | ✅ 标题、正文、话题单选、字数与字段级校验、服务端错误回显；✅ 选图与上传（先建帖后逐张上传，按张回报进度） | `web/src/features/posts/` | 提交后跳转详情且内容完整（`VR-M3-10`） |
| `M3-S5-T2` | 详情页 | ✅ 完整正文（保留段落换行）、作者与时间、话题、相关帖子、作者操作、评论区占位；✅ 图文混排与图片删除 | 同上 | 刷新后内容仍在（`AC-05`） |
| `M3-S5-T3` | 信息流接入 | ✅ 真实 API、三 Tab、游标哨兵、话题筛选；⏳「有新帖」提示未做 | `web/src/features/feed/` | 快速翻页无重复 / 跳项（`VR-M3-12`） |
| `M3-S5-T4` | 滚动恢复 | ✅ 从详情返回恢复列表位置（`sessionStorage`，按 Tab / 话题分键） | `web/src/hooks/useScrollRestore.ts` | 位置一致 |
| `M3-S5-T5` | 空态校准 | ✅ 无真实内容时展示引导空态；离线预览单独提示，不冒充数据 | `FeedView` / `EmptyState` | `AC-17` 前置 |

**M3 交付物**：帖子 CRUD 与信息流、图片上传管线、九类话题与筛选、详情页、演示数据与空态。

**M3 完成判据**：`AC-04`、`AC-05`、`AC-06`、`AC-09` 有验证记录；`DoD-01`—`DoD-10` 全部满足；图片文件与 `post_images` 引用一一对应。

**风险与回退**：上传管线是安全重点，须先于前端上传界面完成；文件格式白名单变更只影响 `image-pipeline.ts`。游标分页若出现重复，回退至单键游标并补充索引。

---

### M4 · 点赞、收藏、评论与通知

**目标**：建立互动闭环，计数准确且不可重复，全部写操作在事务内完成。

**当前进度**（2026-11-14）：`M4-S1`—`M4-S6` **全部交付并随 `v1.2.0` 发布**，验证记录 `VR-M4-01`—`VR-M4-10` 全部通过，六个子阶段 `24/24` 子任务完成。`M4-S1` / `S2` / `S3` 互动数据模型、点赞收藏、评论（`VR-M4-01`—`VR-M4-07`）；`M4-S4` 通知域：通知读取接口与通知中心界面，评论提醒闭环打通（`VR-M4-08`）；`M4-S5` 一人一码邀请制：统一邀请码下线，改为逐码生成、事务内原子消费、可撤销（`VR-M4-09`）；`M4-S6` 自助改密：登录后凭当前口令改密、同事务撤销其它会话（`VR-M4-10`）。M4 已闭环。

**前置条件**：`M3` 完成；帖子与用户信息可读。

#### `M4-S1` 互动数据模型

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M4-S1-T1` | 互动表 | ✅ `005_interactions.sql` 建立 `likes`、`bookmarks`（复合主键 `(user_id, post_id)` 兼作唯一约束）、`comments`（单层、状态机、软删除一致性） | `migrations/005_*.sql` | `UNIQUE(user_id, post_id)` 生效 |
| `M4-S1-T2` | 通知表 | ✅ 并入 `005_interactions.sql`：`notifications` 含类型白名单、`target_type`/`target_id` 成对约束，`(user_id, created_at DESC, id DESC)` 与未读部分索引 | `migrations/005_*.sql` | 索引与架构 §7.4 一致 |
| `M4-S1-T4` | 评论长度口径 | ✅ `006_comment_length.sql` 将上限由 1000 放宽至 **2000 字符**（按 Unicode 码点计），并改用 `btrim(body, E' \t\n\r\f\v')` 兜底非空——`btrim(body)` 只裁空格，纯换行可绕过 | `migrations/006_*.sql` | 2000 通过、2001 被拒、2000 个 emoji 通过 |
| `M4-S1-T3` | 计数约束 | ✅ `003` 已建 `like_count` / `comment_count` / `bookmark_count` 与 `posts_counts_nonnegative`，本阶段复核确认无需改动 | `003` 迁移内约束复核 | 计数不为负 |

#### `M4-S2` 点赞与收藏

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M4-S2-T1` | ✅ 点赞服务 | 写入 / 删除 `likes` 与更新计数在同一事务；重复请求不产生重复行 | `modules/interactions/` | `AC-07` 有记录，并发重复请求幂等 |
| `M4-S2-T2` | ✅ 收藏服务 | 同上，作用于 `bookmarks`；幂等开关 + 计数事务 | `modules/interactions/` | 刷新后计数与数据库一致（`VR-M4-03`）。**仅有收藏开关与计数，无独立收藏列表接口 / 页面**；收藏列表界面属未完成项，见公告 status 条目（本行记录 M4-S2 当时状态；收藏列表已于 M4 收尾后第 1 步补齐，见 `VR-M4-12`） |
| `M4-S2-T3` | ✅ 端点挂载 | `PUT` / `DELETE` 语义端点注册并挂载认证守卫 | `app.ts` | 未登录请求被拒 |
| `M4-S2-T4` | ✅ 乐观更新 | 前端先更新、服务端校对、失败回滚并提示 | `web/src/features/posts/components/PostInteractions.tsx` | 断网场景计数回滚，不出现假计数；成功以服务端返回计数校正 |

#### `M4-S3` 评论

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M4-S3-T1` | ✅ 评论 API | 发表（`POST /api/posts/:id/comments`）、时间倒序游标列表（`GET` 同路径，`optionalAuth`）、作者 / 管理员移除（`DELETE /api/comments/:id`） | `modules/comments/` | `AC-08` 有记录 |
| `M4-S3-T2` | ✅ 计数事务 | 发表 / 移除与 `posts.comment_count` 同事务；计数更新带 `status='published'` 条件，帖子在检查与写入之间被删时整笔回滚；扣减用 `GREATEST(-1, 0)` | 同上 | 明细与计数一致 |
| `M4-S3-T3` | ✅ 内容校验 | 长度 1–2000 按码点、纯空白、孤立代理项在服务层拦截；正文以纯文本存储、前端文本节点渲染，不引入 HTML | `comment.schema.ts` | 空 / 超长 / 含标记被正确处理 |
| `M4-S3-T4` | ✅ 评论区前端 | 发表框（码点计数、超限禁用）、时间倒序列表、加载更多、作者 / 管理员删除入口；未登录显示登录引导 | `web/src/features/posts/components/CommentSection.tsx`、`CommentEntry.tsx` | 单层结构，无无功能回复入口 |
| `M4-S3-T5` | ✅ 通知触发 | 评论与通知同事务写入；`author_id <> 评论者` 过滤自通知；`target_type='comment'`、`target_id=评论主键` | `comment.repository.ts` | 通知计数与列表一致（通知读取 API 属 `M4-S4`） |

#### `M4-S4` 通知域

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M4-S4-T1` | ✅ 通知 API | 列表（键集游标 + 未读数 + 全部已读） | `modules/notifications/` | 已读状态持久化；未读数来自服务端 |
| `M4-S4-T2` | ✅ 通知中心 | 顶栏铃铛红点（99+ 截断）、未读计数、列表页、相对时间 | `web/src/features/notifications/` | 三态完整，移动端可达；未读高亮 |

#### `M4-S5` 一人一码邀请制（替换 `M2-S2` 统一码）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M4-S5-T1` | ✅ 邀请码表 | `009_invite_codes.sql`：`code_hash`（HMAC-SHA256，Crockford Base32 明文）、状态机 `available→used/revoked`、`created_by/used_by/used_at/revoked_at` 与索引 | `migrations/009_*.sql` | 状态约束与唯一哈希生效 |
| `M4-S5-T2` | ✅ 生成与撤销 | 逐批生成（1–50，备注可选），明文仅返回一次；未用码可撤销，已用 / 已撤销不可改回 | `modules/invite/` | 生成返回明文、撤销置 `revoked` |
| `M4-S5-T3` | ✅ 原子消费 | 注册在同一事务内 `UPDATE ... SET status='used' WHERE code_hash=$1 AND status='available'`；无效码整笔回滚，避免「码废号建成」 | `modules/auth/auth.repository.ts` | 一码一账号；错码 `INVITE_INVALID` |
| `M4-S5-T4` | ✅ 下线统一码 | 移除 `INVITE_CODE` 环境变量与 `inviteCodeMatches`；`auth.service` 改为哈希校验 | `config/env.ts`、`rate-limit.ts` | 旧通用码注册提示无效 |
| `M4-S5-T5` | ✅ 管理界面 | 管理员「运营管理 → 邀请码」生成 / 列表 / 撤销 | `web/src/features/invite/`、`admin.routes.ts` | admin 角色守卫下可用 |

#### `M4-S6` 自助改密（补齐公告缺口）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M4-S6-T1` | ✅ 改密 API | `POST /api/auth/change-password`，`requireAuth` 守卫；新旧口令复用 `PASSWORD_MIN/MAX` 与 Argon2id | `auth.controller.ts`、`auth.routes.ts`、`auth.service.ts` | 未登录 401、旧密码错 401、新密码太短 400 |
| `M4-S6-T2` | ✅ 会话撤销 | 同事务更新口令哈希 + 删除该用户除当前会话外的全部 `sessions` | `auth.repository.ts` `runPasswordChange` | 当前会话保留、其它会话 401 |
| `M4-S6-T3` | ✅ 独立失败限流 | 新增 `password_change_ok` / `password_change_fail` 事件，旧口令爆破独立计数（与登录失败同阈值） | `constants.ts`、`rate-limit.ts` | 连续错 5 次触发 `RATE_LIMITED` |
| `M4-S6-T4` | ✅ 设置页界面 | 「修改密码」分区：三次输入 + 即时校验 + 成功提示 | `web/src/features/profile/PasswordSection.tsx` | 390px 渲染与真实提交成功 |

#### M4 验证记录

| 编号 | 验证项 | 结果 | 证据 |
| --- | --- | --- | --- |
| `VR-M4-01` | 互动数据模型（`M4-S1`） | 通过 | 隔离环境（WASM PostgreSQL）依次执行 `001`–`005` 全部成功；四张表与五个索引存在。约束负向用例全部被拒：重复点赞 / 重复收藏触发主键冲突、纯空白评论、1001 字符评论、非法状态、`deleted` 缺 `deleted_at`、负 `like_count`、非法通知类型、`target_type` 与 `target_id` 不成对；正向用例 1000 字符评论可写入。级联行为：删帖后点赞 / 收藏 / 评论清空；触发者物理删除后通知保留且 `actor_id` 置 `NULL`；接收者删除后通知级联删除。合计 34 项断言全通过 |

| `VR-M4-02` | 评论长度口径与 Unicode 校验 | 通过 | 新增可重复测试设施（`server/tests`，`node:test` + `tsx` + PGlite 内存库，`npm test` 一条命令跑完，已并入 `npm run verify`）。30 项断言全通过，其中先写的失败用例暴露两个真实缺陷并已修复：① `requireString` 用 `String.length`（UTF-16 码元）计数，10 个 emoji 被算成 20 字符，与 PostgreSQL `char_length`（码点）分裂——改为 `countChars()` 后 10 个 emoji 可正常通过，ZWJ 家庭 emoji 按 7 码点计；② 孤立代理项（`\uD800`）能通过校验，进入 pg 参数编码阶段抛错变成 500——改为在长度判定前用孤立代理正则拦截，返回 `VALIDATION_FAILED`。数据库侧另修：`btrim(body)` 挡不住纯换行 / 制表符评论，改为显式空白集合，四组纯空白样本均被拒。 |

| `VR-M4-03` | 点赞 / 收藏接口与计数事务（`M4-S2`） | 通过 | 真实 PostgreSQL 16 + 真实 Express + 真实 HTTP，21 项断言全过：点赞 0→1、重复点赞仍 1、第二用户 →2、取消 →1、重复取消仍 1；收藏计数独立且不影响点赞；登录读者 `isLiked=true`、匿名读者 `isLiked=false` 而计数保留；未登录 `401`、不存在帖子 `404`、非法 id `404`；**20 个并发首次点赞全部 200 且最终计数为 1**（唯一约束压住重复插入，未出现先查后插的双计数）；删帖后点赞 `404`。另在隔离库以 `runToggle` 直测 8 项：幂等、计数不为负（`GREATEST` 兜底）、收藏独立、不存在帖不产生孤儿明细 |
| `VR-M4-04` | 互动按钮的真实浏览器行为 | 通过 | Chromium 390 px 视口，登录态打开详情页：初始 `aria-pressed=false`、显示「0 点赞」；点击后立即 `aria-pressed=true`、显示「1 点赞」，收藏同步为 1；刷新后仍为已点赞 / 已收藏（状态来自服务端而非本地）；匿名点击跳转 `/login`；控制台 0 错误。截图见 `preview/ui-interactions-detail.png` |

| `VR-M4-05` | 评论接口、计数与权限（`M4-S3`） | 通过 | 真实 PostgreSQL + 真实 Express + 真实 HTTP，19 项断言全过：匿名可读列表、未登录发表 401、发表后 `commentCount` 同步、作者看他人评论 `isAuthor/canRemove` 均为 false、通知写入接收者为帖子作者且触发者为评论者、纯空白 400、2001 字符 400、2000 字符可发表、作者删除后计数回落、重复删除 404、非作者删除 403、不存在帖子 404、非法 limit 400、游标翻页不重复不遗漏且最新在上 |
| `VR-M4-06` | 管理员移除与可见性 | 通过 | 将测试账号临时提权为 admin 后：移除他人评论返回 200，入库 `status='removed'` 且 `deleted_at` 为 NULL（满足 `comments_deleted_consistent`）；管理员列表能看到该项并标 `removed` / `canRemove=true`，普通读者列表为空；`commentCount` 扣减为 0。另在隔离库直测 9 项：自评论不产生通知、`deleted` 带 `deleted_at`、重复移除返回 null 且计数不为负、帖子不存在时事务整体回滚不留孤儿评论 |
| `VR-M4-07` | 评论区真实浏览器行为 | 通过 | Chromium 390 px：登录态详情页评论区显示标题计数、输入框、`0 / 2000` 计数器；输入后点发送，新评论出现在列表首位、计数器回零；删除按钮弹出确认框，确认后条目消失、计数回落；匿名视角显示「登录后可以参与讨论。」且不渲染输入框；控制台 0 错误。截图 `preview/ui-comments-390.png`、`ui-comments-after-post-390.png`、`ui-comments-anon-390.png` |

| `VR-M4-08` | 通知中心真实浏览器行为（`M4-S4`） | 通过 | 本地真实 PostgreSQL + 真实 Express + 真实前端构建产物，Chromium 390 px 无头浏览器：登录态访问 `/notifications`，收到评论通知（「验证用户 评论了你的帖子《验证帖》」），未读项高亮（浅底 + 蓝边 + 蓝点），标题下「全部标为已读」按钮可见；点该按钮后未读数归零、铃铛红点消失。顶栏铃铛未读数 `>0` 时显示红点角标（含数字，超过 99 记 `99+`），`=0` 时隐藏；匿名态铃铛不展示红点。控制台 0 错误。截图 `preview/verify-notif-unread-390.png`、`verify-home-unread-390.png` |
| `VR-M4-09` | 一人一码邀请制与管理界面（`M4-S5`） | 通过 | 后端 15 项端到端断言全过（真实库 + 真实 HTTP）：管理员生成 4 个明文码（一次返回后不重复出现）、用码注册成功并置 `used`、已用码二次注册 `INVITE_INVALID`、撤销未用码置 `revoked`、已撤销码注册 `INVITE_INVALID`、可用码仍可注册；管理员发帖 → 用户评论触发给作者的评论通知（未读 +1）；邀请码列表状态 `used/revoked/available/used` 正确。前端 390 px 无头浏览器：`/invite-codes` 渲染生成表单（数量 1–50、备注）与状态列表（可用 / 已用 / 已撤销 Badge + 撤销按钮仅对可用项出现），`/register` 含邀请码输入框（提示「邀请制，请向邀请人索取」）；控制台 0 错误 |

| `VR-M4-10` | 自助改密真实浏览器与端到端行为（`M4-S6`） | 通过 | 本地真实 PostgreSQL + 真实 Express + 真实 HTTP，15 项断言全过：管理员生成邀请码 → 注册测试用户 → 双会话登录；未登录改密 `401 AUTH_REQUIRED`、旧密码错 `401 INVALID_CREDENTIALS`、新密码太短 `400 VALIDATION_FAILED`、正确改密 `200 {"changed":true}`；改密后当前会话 `/api/auth/me` 仍 `200`、其它会话 `401`；旧密码登录被拒、新密码登录成功；连续错误旧密码第 5 次触发 `429 RATE_LIMITED`。另 6 项 PGlite 集成测试覆盖哈希更新、只撤销其它会话、不影响他人会话、Argon2id 往返与损坏哈希容错（测试数 51→57）。前端 390 px 无头 Chromium：`/settings` 显示「修改密码」分区（当前 / 新 / 确认三次输入、提示、保存按钮），无横向溢出；真实提交后出现「密码已修改成功，其它设备需重新登录」，控制台 0 错误 |

| `VR-M4-11` | 站内许可与源码入口（`M4` 收尾后的合规补充，非 `M4` 功能） | 通过 | `npm run verify` 全绿：`typecheck` / `build` / `check:size` / `lint`（0 违规、行数预算内）/ `test`（62 项全通过，含新增 `server/tests/unit/about-doc.test.ts` 5 项）。`/api/meta/about` 新增 `licensing` 字段（三类许可 + `sourceUrl` + `sourceNote`），`MetaAbout` 同步；「关于」页渲染许可卡片，页脚「源码」链接复用同一地址，不另写一份。断言覆盖：三类许可顺序与内容、源码地址为 https 且含索取兜底、文案不含「已公开 / 尚未公开 / 私有仓库」等会随仓库可见性漂移的表述、未完成四项与公告 `status` 真源一致、已交付能力不再被写成未完成。另用 Chromium 窄视口（实测 485×757，底部导航可见）+ 只读静态服务喂编译后的真实 `ABOUT` 常量验证 `/about`：许可卡片、三类许可名、仓库地址均渲染；页脚 8 个链接（7 个说明页 + 「源码」）、`sourceHref` 为 `https://github.com/xiaoyu-hue/starpal`；无过时文案；以**内容底边**判定，滚动到底时链接列表 / 许可标注的视口 y 为 629 / 661，底部导航顶边 692，均未被遮挡；无横向溢出（`scrollWidth == clientWidth == 485`） |

| `VR-M4-12` | 我的收藏列表（`M4` 收尾后第 1 步，非 `M4` 功能） | 通过 | `npm run verify` 全绿：`typecheck` / `build` / `check:size`（222 个源文件全部在预算内）/ `lint`（硬规则 0 违规）/ `test`（68 项全通过，含新增 `server/tests/integration/bookmarks-list.test.ts` 5 项）。PGlite 真库断言：只返回本人且仍可见的收藏、按收藏时间倒序（同时间以 id 为第二键）、投影带出收藏时间与已注销作者占位署名、游标编解码往返后翻页不重不漏、他人收藏与空页。`GET /api/users/me/bookmarks` 挂在 `/me` 整组 `requireAuth` 下、只按 `principal.id` 查询；构建产物确认 `BookmarksPage` 独立分包、帖子页面仍独立分包。无头 Chromium 复核首页 / `/bookmarks` / `/settings` 三路由 `id="root"` 正常挂载、无 Uncaught JS 错误、未登录访问受保护路由落到登录页（静态预览无后端，接口错误态属预期）。**登录态下收藏页与卡片收藏按钮的完整交互 E2E 未执行**（需真实后端与登录态），如实标注为未验证 |

| `VR-M4-13` | 我的点赞列表（`M4` 收尾后第 2 步，非 `M4` 功能） | 通过 | `npm run verify` 全绿：`typecheck` / `build`（2317 模块）/ `check:size`（226 个源文件全部在预算内）/ `lint`（硬规则 0 违规）/ `test`（74 项全通过，含新增 `server/tests/integration/likes-list.test.ts` 5 项与 `about-doc.test.ts` 新增 1 项「点赞列表已交付」断言）。新增 `010_likes_user_idx.sql` 补 `likes_user_idx`，PGlite 真库随 `createMigratedDb()` 一并应用，断言：只返回本人且仍可见的点赞、按点赞时间倒序（同时间以 id 为第二键）、投影带出点赞时间与已注销作者占位署名、游标翻页不重不漏、他人点赞与空页。`GET /api/users/me/likes` 挂在 `/me` 整组 `requireAuth` 下、只按 `principal.id` 查询；写入后 `useLikeMutation` 同时失效 `feedKeys`（点赞改变热门排序）与 `likeKeys`。构建产物确认 `LikesPage` 独立分包（1.6K chunk）、`likes-heading` / 空态文案只出现在该 chunk、主包未拖入页面代码。无头 Chromium 复核首页 / `/bookmarks` / `/likes` / `/settings` 四路由 `id="root"` 正常挂载、无 Uncaught JS 错误、未登录访问受保护路由落到登录页（静态预览无后端，接口错误态属预期）。**登录态下点赞页与详情页取消赞的完整交互 E2E 未执行**（需真实后端与登录态），如实标注为未验证 |

| `VR-M4-14` | 举报 + 申诉最小闭环（`M4` 收尾后第 3 步，非 `M4` 功能） | 通过 | `npm run verify` exit 0：`typecheck` 全绿 / `build`（2326 模块）/ `check:size`（扫描 243 个源文件，全部在预算内）/ `lint`（硬规则 0 违规、软告警 70 处）/ `test`（90 项全通过，其中 `server/tests/integration/reports.test.ts` 15 项 PGlite 真库、`server/tests/unit/about-doc.test.ts` 新增 1 项「举报与申诉已交付」断言）。新增 `011_reports.sql`，`createMigratedDb()` 随真库一并应用；15 项断言覆盖：CHECK 约束拒绝非法 kind / status 与目标不一致、pending 与终态字段一致性、同一人对同一目标 pending 唯一且处置后允许再报、申诉忽略伪造 target / reason、入参校验、目标可见性（草稿 / 已移除 / 已删除 / 停用作者 / 归档话题 / 已删评论按不存在处理）、重复举报归一 `CONFLICT`、普通用户看不到队列且不能决策而管理员可以、终态不可重决、我的提交只返回本人、键集游标翻页不重不漏、队列按状态过滤。构建分包复核：`AdminReportsPage` / `MyReportsPage` / `ReportButton` / `ReportList` / `reports.queries` 各自独立 chunk，`admin-reports-heading` / `my-reports-heading` / `请选择原因` / `处理这条提交` 只出现在对应 chunk，主包 `index-B7chid3o.js` 命中数为 0。无头 Chromium（390×844，SPA 静态预览）复核 `/`、`/reports`、`/admin/reports`、`/invite-codes`、`/settings` 五条路由：`id="root"` 均有内容、0 个 `pageerror`；未登录访问四个受保护路由均回落 `/login` 并显示「该页面需要登录后访问」，守卫生效。**登录态下举报 / 申诉提交的完整 HTTP 端到端未执行**（需真实后端与登录态；静态预览无后端，服务端权限矩阵仅由 PGlite 真库服务层用例覆盖），如实标注为未验证 |

**M4 交付物**：点赞 / 收藏 / 评论 API 与前端、计数事务、通知中心、一人一码邀请制、自助改密。

**M4 完成判据**：`AC-07`、`AC-08` 有验证记录；唯一约束在并发下生效；`DoD-01`—`DoD-10` 全部满足。

**风险与回退**：计数一致性依赖事务，任何绕过服务层的写入都会破坏计数；若发现不一致，以明细重算并补充校验脚本。

---

### M5 · 私信、成就、搜索与导出

**目标**：补齐草图与需求文档合并后的追加能力，同时保证数据可移植。

**前置条件**：`M4` 完成。

> **迁移编号口径（M5 / M5.5 / M6 通用）**：`server/src/db/migrations/` 的顺序编号以**目录实际占用**为准。`M4` 收尾时已用到 `009_invite_codes.sql`，其后「我的点赞」列表占用 `010_likes_user_idx.sql`，「举报 + 申诉最小闭环」又占用 `011_reports.sql`，因此 `M5` / `M5.5` / `M6` 的新迁移一律从下一个可用序号（现为 `012`）起顺编，且只增不改已应用的历史迁移。`M5.5-S1`（头衔列）已占用 `012_user_titles.sql`（见 `VR-M5.5-01`），`M5-S1`（私信）占用 `013_messages.sql`（见 `VR-M5-S1-01`），`M5-S2`（成就与每周热门）占用 `014_achievements.sql`（见 `VR-M5-S2-01`），其图标方案修订又占用 `015_drop_achievement_icon.sql`，`M6-S0`（社区公告分层）占用 `016_announcements.sql`，随后的摘要修订占用 `017_status_announcement_scope.sql` 与 `018_status_summary_no_enumeration.sql`，`M5.5-S2`（等级）占用 `019_user_level.sql`，公告口径随等级上线又追加 `020_status_announcement_level.sql`（见 `VR-M5.5-02`），段位徽标占用 `021_user_rank_badge.sql`。`M6` 治理数据模型占用 `022_moderation.sql`（见 `VR-M6-01`）。下表文件名统一用 `NNN_` 占位前缀（`NNN` = 开工时目录里的下一个可用序号，现为 `023`），不再预填具体编号——早期计划中的 `005` / `006` / `007` / `008` 已被 M1–M4 实际占用，照抄会导致文件覆盖或迁移账本冲突。

#### `M5-S1` 私信（留言式）✅ 已完成（2026-11-15）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M5-S1-T1` | 会话与消息表 | `013_messages.sql` 建立 `conversations`、`messages`；两人会话由 `LEAST/GREATEST` 归一化 + 普通列唯一约束保证唯一（PGlite 不支持表达式唯一约束，生产与测试同一写法） | `migrations/013_messages.sql` | 重复/反向创建返回同一会话 |
| `M5-S1-T2` | 私信 API | 会话列表、创建 / 获取、消息游标列表、发送；参与者校验 | `modules/messages/` | 非参与者访问被拒 |
| `M5-S1-T3` | 留言式前端 | 会话列表、消息列表、发送框、刷新获取；他人主页「发私信」入口与 `?to=` 直达 | `web/src/features/messages/` | 消息刷新后可见，无实时推送 |
| `M5-S1-T4` | 升级余地确认 | 表结构与服务层不依赖传输方式，新增推送模块不需改表 | 架构 §10.1 复核 | 评审记录留档 |

#### `M5-S2` 成就与每周热门 ✅ 已完成（2026-11-15）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M5-S2-T1` | 成就表 | `014_achievements.sql` 建立 `achievements`（`condition` JSONB，`CHECK` 钉住 `metric` + 数值 `gte` 结构）与 `user_achievements`（复合主键 `(user_id, achievement_code)` 即唯一性）；随结构写入九条种子成就。`015` 随后移除 `icon` 列——图标属表现层，改由前端按 `code` 自绘 | `migrations/014_*.sql`、`015_*.sql` | 同一用户对同一成就唯一（重复判定只留一条） |
| `M5-S2-T2` | 解锁服务 | 七个指标一次 SQL 算完，引擎只认「指标 + 阈值」，不改业务写路径；采用**读时判定**：读取时间线时补写达标记录，`ON CONFLICT DO NOTHING` 保证幂等 | `modules/achievements/` | 新增成就只插一行数据，不改 TypeScript |
| `M5-S2-T3` | 时间线前端 | `/achievements` 替换占位页，已解锁（按时间倒序）+ 未解锁两块；资料页新增「成就」区块；设置页新增「我的成就」卡片作为可达入口（初版只有「帖子 → 作者名 → 资料页」一条路径，没发过帖的用户在手机上无法到达，见 `VR-M5-S2-02`） | `web/src/features/achievements/`、`web/src/features/profile/SettingsSections.tsx` | 无排行榜 / 签到 / 无限滚动 / 进度百分比 |
| `M5-S2-T4` | 每周热门 | **改为服务层只读聚合**，不建视图、不落表、不跑定时任务；按东八区周一为界，`赞 + 评论×2` 排序，取 5 条，至少 1 个互动才入榜 | `modules/achievements/achievement.repository.ts` | 刷新即变，无任何额外写入 |

#### `M5-S3` 搜索 ✅ 已完成（2026-11-15）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M5-S3-T1` | 检索 API | 帖子标题 / 正文 / 话题名称检索，类型过滤与分页 | `modules/search/` | 结果仅含权限范围内可见内容 |
| `M5-S3-T2` | 搜索页 | 顶栏搜索接入、结果页、空态 | `web/src/features/search/` | 空关键词与无结果态明确 |

#### `M5-S4` 数据导出 ✅ 已完成（2026-11-15）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M5-S4-T1` | 导出 API | `GET /api/export?format=md|json`，仅本人数据，含帖子、评论、图片引用、资料 | `modules/export/` | `AC-16` 有记录 |
| `M5-S4-T2` | 格式校验 | 导出文件可被外部工具读取，不含其他用户数据 | `scripts/export-check` | `export:check` 通过 |
| `M5-S4-T3` | 入口 | 设置页导出入口与说明 | `web/src/features/profile/ExportSection.tsx` | 入口可达，说明清晰 |

> **实现要点与两处对计划的修正**（2026-11-15）：
> 1. **不套 `sendData` 包络**。全站响应统一 `{ data }`，但导出物是文件，包一层会让 `export-check.mjs` 与任何外部工具都读不出顶层 `user`。控制器直接写响应体 + `Content-Disposition: attachment` + `Cache-Control: no-store`。
> 2. **`T3` 的产出路径由 `web/src/features/export/` 改为 `web/src/features/profile/ExportSection.tsx`**。导出只有设置页里的一个区块，没有独立路由与查询逻辑，建独立 feature 目录会得到一个只放单个组件的空壳；放在 `profile/` 与 `PasswordSection` / `TitlesSection` 同级，符合现有目录惯例。
> 3. **范围三条硬边界**：不含私信（含对方内容）、图片只给可访问链接不给二进制（Serverless 响应上限 4.5 MB）、只导出不导入（个人文件重建不出社区关系，整站恢复走数据库备份）。三条均写入界面说明与站内公告。
> 4. 草稿与软删除内容照样导出并标注状态——只导已发布的话，用户删掉的草稿永远找不回来。

**M5 交付物**：私信、成就时间线与每周热门、搜索、数据导出。

**M5 完成判据**：`AC-16` 有验证记录；`DoD-01`—`DoD-10` 全部满足；导出文件与数据库内容一致。

**M5 状态：✅ 已收尾，随 `v1.3.0` 发布（2026-11-15）**。四个子阶段 `M5-S1`—`M5-S4` 全部交付并各有验证记录，收尾核对见 `VR-M5-CLOSE`。收尾时确认**有一处需求按 1/5 交付并已登记偏差**：`FR-AUX-01` 五类通知只实现「评论」一类，其余四类的理由写在 `PRD.md` §4.11 的「已知范围偏差」表内，不做代码补齐。这不是遗漏被追认，是**主动收窄并对外披露**——公告正文已写明「通知只在你收到评论时发出」。

**风险与回退**：私信与成就均为独立模块，可单独回退而不影响互动链路；导出为只读，风险最低。

##### `VR-M5-S1-01` · M5-S1 私信验证记录（通过）

- **环境**：本地 `node:test` + PGlite 内存真库（跑全部 `001`–`013` 迁移），`npm run verify` 全链路。
- **实现**：迁移 `013_messages.sql` 建 `conversations`（`participant_a/b`、`CHECK` 禁止自聊、`UNIQUE(participant_a, participant_b)`）与 `messages`（`body` 非空 `CHECK`、`ORDER BY created_at DESC, id DESC` 的复合索引）。后端 `server/src/modules/messages/`（schema / repository / service / controller / routes / barrel）提供 `POST /api/messages`、`GET /api/messages`、`GET /api/messages/:id`、`GET /api/messages/:id/messages`、`POST /api/messages/:id/messages`；整组挂 `requireAuth`，服务层再用 `getConversationFor` 二次校验参与者。前端 `web/src/features/messages/`：`/messages` 替换占位页，会话列表 + 线程 + 发送框，桌面侧栏补入口、移动端底部 Tab 原有入口不变，他人主页新增「发私信」按钮（`?to=用户名` 直达并自动建会话）。
- **关键取舍**：① 会话唯一性用「插入时 `LEAST/GREATEST` 归一化 + 普通列唯一约束 + `ON CONFLICT DO UPDATE SET id = conversations.id` 取回既有行」，而不是表达式唯一约束——PGlite（测试库）不支持 `UNIQUE (LEAST(...), GREATEST(...))`，该写法能让生产与测试跑同一段 SQL；② 消息正文在服务层兜底 `trim` + 非空 + 2000 字上限，避免绕过 schema 直调服务时写入空白消息；③ 本期不做未读红点 / 实时推送（用户确认），不改通知模块。
- **真实命令与输出**：新增 `server/tests/integration/messages.test.ts`，6 项断言——创建会话幂等（重复 + 反向均返回同一 id）、不能与自己发起（`FORBIDDEN`）、收件人不存在（`VALIDATION_FAILED`）、发送后对方会话列表可见最近消息预览且键集游标分页不重不漏、非参与者读会话/读消息/发消息三路均 `FORBIDDEN`、空白与超长消息被拒且首尾空白归一后入库。`npm run verify` 全绿（**113** 项测试通过、lint 硬规则 **0** 违规）。
- **测试基建修正（如实记录）**：新增测试文件后，`verify` 首轮出现两处 **SIGKILL**（`bookmarks-list`、`interaction-flags`），非断言失败——`node --test` 默认按 CPU 核数（本机 32）并发，同时起 32 个 PGlite WASM 实例触发容器内存上限。已在 `server/package.json` 的 `test` 脚本显式加 `--test-concurrency=4`，复跑 113 项全通过。这是运行方式修正，未改动任何断言或阈值。
- **真实局限（如实标注）**：**登录态下「主页发私信 → 输入 → 发送 → 对方刷新看到」的完整浏览器交互 E2E 未执行**（数据层与权限边界由 6 项 PGlite 真库测试覆盖，前端只做了类型检查与构建）；无实时推送、无未读红点，会话列表不显示未读数。

##### `VR-M5-S2-01` · M5-S2 成就与每周热门验证记录（通过）

- **环境**：本地 `node:test` + PGlite 内存真库（跑全部 `001`–`014` 迁移），`npm run verify` 全链路。
- **实现**：迁移 `014_achievements.sql` 建 `achievements`（`code` 主键、`condition` JSONB、`CHECK` 钉住「有 `metric` 且 `gte` 为数字且非负」）与 `user_achievements`（复合主键 `(user_id, achievement_code)`），并写入九条种子成就。后端 `server/src/modules/achievements/`（engine / repository / service / controller / routes / barrel）提供 `GET /api/achievements/:username`（时间线，公开）与 `GET /api/achievements/weekly`（本周热门，`optionalAuth` 仅为补 `isLiked`）。前端 `web/src/features/achievements/`：`/achievements` 替换占位页（`?u=用户名` 看他人，缺省看自己），资料页新增「成就」区块。
- **关键取舍**：① **读时判定**而非写时触发——不碰已上线的发帖 / 评论 / 点赞 / 私信四条写路径，零回归风险、天然不漏挂入口；代价是 `unlockedAt` 记录「判定时刻」而非达成瞬间，页面与公告如实写作「解锁于某日」，不假装精确。② 条件只支持「单指标 + 阈值」，`condition` 存 JSONB，新增成就只插一行数据、不改 TypeScript（`FR-ACH-01` 的落点）；七个指标（发帖 / 评论 / 跨话题 / 被赞 / 私信 / 邀请 / 加入天数）由一条 SQL 的标量子查询一次算完，避免七次往返。③ 每周热门**不建数据库视图**，改为服务层只读聚合——视图无法传「上周」参数、调排序权重就得写新迁移；`FR-ACH-03` 的实质是「不落热量表、不跑定时任务」，服务层查询同样满足，计划文本已同步改写。④ 周界用固定 `interval '8 hours'` 偏移而非 `AT TIME ZONE 'Asia/Shanghai'`，中国自 1991 年起无夏令时，偏移恒成立，且不依赖 WASM 构建的时区库。⑤ 刻意不做：排行榜（只排帖子不排人）、签到、无限滚动、「还差 X 个」进度百分比、成就徽章出现在帖子署名行（避免每张卡片变成荣誉墙）。⑥ 成就配色单独落令牌（陶土棕），避开金 / 紫 / 青三种头衔色——撞色会让徽章被误读成身份等级。
- **真实命令与输出**：新增 `server/tests/integration/achievements.test.ts`，10 项断言——种子成就指标全部存在于代码注册表、新用户不凭空解锁、发帖解锁且重复判定只留一条记录且解锁时间不被覆盖、草稿与已删除帖子及已删评论不计、三个不同话题才解锁「跨界的」且同话题多帖不重复计、按 `like_count` 汇总且零赞不达标、时间线已解锁按时间倒序在前、已注销不展示与停用按不存在处理、本周热门只取本周且有互动的帖子并按权重排序、条件描述为人话。`npm run verify` 全绿（**124** 项测试通过、lint 硬规则 **0** 违规、286 个源文件在行数预算内）。
- **UI 复核方式（如实标注）**：本地用**桩接口**（返回固定 JSON 的临时服务，不入仓库）跑 `vite dev`，以无头浏览器截图复核 `/achievements`（已解锁 4 项 + 未解锁 5 项 + 本周热门 3 条卡片）、`/u/Solvyre`（资料页成就区块 4 枚徽章 + 「4 / 9 · 全部」）、暗色主题、未登录态（提示卡片 + 去登录 + 热门仍可见）。**这不是端到端验证**：桩数据不经过真实 SQL，真实数据链路由上述 10 项 PGlite 测试覆盖。
- **真实局限（如实标注）**：① 解锁时间不等于行为发生时间（读时判定的既有代价，已写进站内文案）；② 已解锁成就不会因条件回退而收回（例如赞被撤销），这是刻意的——记录的是历史事实；③ **登录态下「发帖 → 打开成就页看到新徽章」的完整浏览器 E2E 未执行**；④ 撤赞后 `likes_received` 下降，但已解锁记录保留，与「成就不可撤销」的语义一致，若后续要求可撤销需单独设计。

##### `VR-M5-S2-02` · M5-S2 成就入口可达性验证记录（通过）

- **发现的问题（由移动端走查暴露）**：成就页与资料页区块本身正常，但**没有任何稳定的入口能走到**。移动端底部 Tab 只有五项（首页 / 发现 / 发布 / 私信 / 我的），抽屉 18 项里也没有；设置页同样没有通向自己主页的链接。全站指向 `/u/用户名` 的链接只有三处——帖子卡片作者名、帖子详情页作者名、成就页的「返回主页」。结论：**没发过帖的用户在手机上无法到达自己的成就页**。桌面端存在同一缺口，只是入口更多、不易察觉。这是 `M5-S2-T3` 当初只考虑「放哪儿不挤」、没考虑「怎么走到那儿」的疏漏。
- **改法**：设置页在「我的提交」之后新增「我的成就」卡片（`LinkCard`，通向 `/achievements`），与已有三张卡同构；「我的」Tab 一步即达，桌面与移动同时解决。不新增导航位（桌面侧栏已 10 项、移动已 5 个 Tab，塞不下）。同时把四张同构卡片抽为 `SettingsSections.tsx` 的 `LinkCard`——第 4 处真实重复已超过 `AGENTS.md` 第十节的「2–3 处才抽」阈值。
- **顺带修掉的布局缺陷**：卡片原用 `flex-wrap justify-between`，文案较长的两张（「我的提交」「我的成就」）会把按钮挤到卡片左下角，同一列卡片按钮位置参差。改为按断点分形态：窄屏 `flex-col`（文字占满宽度、按钮在下左对齐），`sm` 及以上 `flex-row items-center justify-between`，文字 `min-w-0 flex-1` 允许收缩、按钮 `shrink-0` 固定右侧。此缺陷在原「我的提交」卡上就存在，非本次改动引入。
- **真实命令与输出**：以 DOM 几何测量复核三种宽度（390 / 768 / 1280），四张卡的按钮位置与文字宽度**完全一致**——390 宽时四张均「按钮在文字下方、左对齐、文字宽 308 / 卡宽 358」；768 与 1280 时四张均「按钮与文字同行、右边距 25」。
- **点击链路**：模拟会话下点击「查看成就」，URL 变为 `/achievements` 且页面渲染出成就列表（`初次发声` 出现 1 次），入口连通。
- **质量门**：`npm run verify` 全绿（**124** 项测试通过、lint 硬规则 **0** 违规、源文件均在行数预算内）。
- **真实局限（如实标注）**：与 `VR-M5-S2-01` 相同，UI 复核走的是模拟会话（`/api/auth/me` 与 `/api/users/me` 由测试脚本注入固定 JSON），**不是真实登录**。真实账号下「点设置 → 我的成就 → 看到自己的徽章」这条链路仍待线上确认。

##### `VR-M5-S3-01` · M5-S3 搜索验证记录（通过）

- **环境**：本地 `node:test` + PGlite 内存真库（跑全部 `001`–`012` 迁移），`npm run verify` 全链路。
- **技术选型**：`ILIKE '%关键词%'`（`ESCAPE '\'` 转义 `% _ \`），**不引入 pg_trgm / tsvector**。理由：内容以中文为主，PostgreSQL 默认分词器不切中文词，`tsvector` 对中文近乎失效；`pg_trgm` 需在 PGlite 构造期声明扩展、会侵入测试基建。小社区数据量下 ILIKE 全表扫描为毫秒级，先够用；将来数据量增大再加 `pg_trgm` 索引，是增量迁移、不动本接口。搜索**不需要新迁移**（标题/正文/话题名均在现有表）。
- **实现**：新增 `server/src/modules/search/`（schema / repository / service / controller / routes / barrel），`GET /api/search?q=&type=all|post|topic&cursor=&limit=` 挂 `optionalAuth`（匿名可搜公开内容，登录者额外补 `isLiked`/`isBookmarked`）；查询复用 `posts` 模块的 `PROJECTION` / `VISIBLE` / `toListItem`（经 `posts/index.ts` 公共出口），保证搜索结果与信息流对同一帖子的可见性完全一致。前端新增 `web/src/features/search/`（`/search` 替换占位、顶栏入口已就位、范围切换、键集游标分页、空关键词与无结果明确空态）。
- **真实命令与输出**：新增 `server/tests/integration/search.test.ts`，7 项断言——中文命中标题、中文命中正文、草稿/已删除/停用作者排除、`type=topic` 只按话题名而 `type=post` 不匹配话题名、键集游标分页不重不漏、空关键词短路、`%` 被转义不匹配一切。`npm run verify` 全绿（**107** 项测试通过、lint 硬规则 **0** 违规）。
- **线上实测（2026-11-15，`4030ade` 部署后 `starpal.cc.cd`，匿名态）**：`GET /api/search?q=星聚` 命中首帖（`author.titles` 随署名一并返回）、`q=闲聊&type=topic` 仅返回话题为闲聊的帖子而 `q=星聚&type=topic` 为空、`q=zzz不存在zzz` 返回空数组、`q=%` 返回空（转义生效未被当通配符）、`q=` 返回 `200` 空结果；无头浏览器截图复核 `/search?q=星聚`（搜索框回填、全部/帖子/话题三档切换、结果卡片含作者头衔徽章与摘要、无布局错乱）与 `/search?q=zzz不存在zzz`（空态仅标题+说明，无伪操作按钮），首页顶栏放大镜入口在位可点。
- **真实局限（如实标注）**：`ILIKE` 无索引加速，数据量显著增长后需补 `pg_trgm`；**登录态下 `isLiked`/`isBookmarked` 由搜索页回填的真值表现未在浏览器端复核**（匿名态验证为 `false`，该字段由 `attachViewerFlags` 复用互动模块既有逻辑，有集成测试覆盖）。

##### `VR-M5-S4-01` · M5-S4 数据导出验证记录（通过）

- **环境**：`node:test` + PGlite 内存真库（跑全部 `001`–`015` 迁移）覆盖 SQL 与渲染；**另起本地 PostgreSQL 16 + 真实会话 Cookie + 无头 Chromium** 做端到端，第一次不是「模拟接口」。
- **技术选型**：
  - **不建视图、不落表**：导出读的是 `posts` / `comments` / `post_images` / `users` ⟕ `user_profiles`，四条参数化查询各带 `WHERE author_id = $1`／`JOIN` 收敛。把边界写在 SQL 里，少一处「忘了过滤」的可能；也避免为此新增迁移（本轮**无新迁移**）。
  - **不导出图片二进制**：`image_blobs` 里是真实字节，一篇 9 图长帖就能上兆。Serverless 函数响应体上限 4.5 MB，含二进制会让「正常用户导自己的数据」变成随机失败。给 `/api/images/<storage_key>` 的可访问链接，接收方按需取。
  - **不做导入**：见 `CHANGELOG` 与公告——个人文件重建不出社区关系，整站恢复走 `pg_dump` 备份（`DEPLOYMENT.md §10`）。
  - **不套 `sendData`**：导出物是文件，顶层必须直接是 `{ schemaVersion, generatedAt, user, posts, comments }`。
- **真实命令与输出**：`npm run verify` 全绿（**130** 项测试通过、lint 硬规则 **0** 违规、行数预算内）。新增 `server/tests/integration/export.test.ts` 6 项：他人帖子/评论/图片不混入；`draft` / `deleted` 状态与删除时间正确；**真产物喂给 `scripts/export-check.mjs` 通过**（`execFileSync` 调真脚本，不做等价断言重写）；Markdown 含「回复《原帖标题》」与多行简介引用块；账号不存在抛 `NOT_FOUND`；用户名 `../../etc/passwd` 被清洗成 `______etc_passwd`。
- **端到端实测（本地 PostgreSQL + 真实会话，2026-11-15）**：未登录 `401 AUTH_REQUIRED`；`format=xml` `400 VALIDATION_FAILED`；`format=json` 返回 `200` + `Content-Disposition: attachment; filename="starpal-<用户名>-<东八区时间>.json"` + `Cache-Control: no-store` + `X-Content-Type-Options: nosniff`，顶层键为 `schemaVersion, generatedAt, user, posts, comments`，`user` 内无 `password_hash` / `role`；`format=md` 为 `text/markdown; charset=utf-8`，正文含资料、帖子（状态标注）、评论（带原帖标题）。浏览器点「下载 JSON / 下载 Markdown」两枚按钮，文件真实落盘（1604 / 1211 字节），下载到的 JSON 再喂 `export:check` 仍通过。桌面 1440 与移动 375 截图复核：卡片标题、说明、两枚按钮并排，无挤压、无溢出，状态文案「已下载 JSON 文件」出现。
- **真实局限（如实标注）**：① **未设总量上限与分片**——若某账号的文字量最终让响应体超过 Serverless 上限（4.5 MB），下载会失败且没有明确提示，需要后续加「分批导出 / 打包下载」；当前社区体量远未触及，但没有压测数据支撑这个判断。② 导出文件里的图片链接指向站点，站点关停则链接失效（这正是「不含二进制」的代价，已在界面与公告写明）。③ 线上（Vercel）尚未验证，本地通过不等于线上通过。

##### `VR-M5-CLOSE` · M5 收尾核对（通过，含一处范围收窄）

- **收尾日期**：2026-11-15。**范围**：`M5-S1` 私信、`M5-S2` 成就与每周热门、`M5-S3` 搜索、`M5-S4` 数据导出，四个子阶段全部交付。
- **`DoD-01`—`DoD-10` 逐条结论**（只有一处为设计例外，未放宽）：

| 判据 | 结论 | 依据 |
| --- | --- | --- |
| `DoD-01` | 通过 | `npm run verify` 全绿：`typecheck` / `build` / `check:size` / `lint` 硬规则 0 违规 |
| `DoD-02` | 通过 | 服务端类型检查通过，本地 `GET /api/health` 返回 200 |
| `DoD-03` | 通过 | 迁移 `012`—`017` 由 `createMigratedDb()` 在每个 PGlite 用例中从空库全量执行；`017` 依赖 `016` 的种子，串行顺序已验证可重复执行 |
| `DoD-04` | **例外（已在 `M5-S4` 说明）** | 导出成功响应对外是**文件**而非 `{ data }` 包络，包一层则 `export-check` 与外部工具都读不出顶层 `user`；错误响应的包络与其余端点一致 |
| `DoD-05` | 通过 | 私信 / 成就 / 搜索页具备加载、错误、空三态；权限在服务端校验（导出未登录 `401`，成就与搜索按可见性收敛） |
| `DoD-06` | 通过 | `ARCHITECTURE.md` §5.3 / §6.2 / §7.3 与前端类型定义同步 |
| `DoD-07` | 通过 | `README.md`、`CHANGELOG.md`、本文状态均更新 |
| `DoD-08` | 通过 | `VR-M5-S1-01`—`VR-M5-S4-01` 齐全，未执行项在各条「真实局限」中逐条标注 |
| `DoD-09` | 通过 | 全仓库扫描 `ghp_` / `github_pat_` / `sk-` / `AKIA` 无命中；`.env` 被 `.gitignore` 忽略，仅 `.env.example` 入库 |
| `DoD-10` | 通过 | 成就未引入排行榜、签到、无限滚动与进度百分比（`FR-ACH-04`）；热门只排帖子不排人 |

- **一处范围收窄，已登记不补代码**：`FR-AUX-01` 要求五类通知，实际只实现「评论」一类。收尾时评估过补齐点赞通知（改动 `interaction.repository.ts` 写入侧、`notification.repository.ts` 的 `LIST_SELECT`、前端 `describe` 与防刷屏索引，约半天），**决定不做**，理由是通知噪音与当前社区规模不匹配；其余三类（私信 / 公告 / 提及）分别因重复打扰、无 `@` 功能而不适用。偏差表与逐条理由写在 `PRD.md` §4.11。**这不是「没找到问题」，是「确认问题后决定不做」，两者不同。**
- **线上验证（Vercel，2026-11-15）**：推送 `6e96fa4..998eaab` 后核对——首页 JS 指纹换为 `index-BwBX20TQ.js`（270K）；`GET /api/meta/announcements` 返回三段式（`pinned` 1 条、`notices` 0 条、`history` 17 条）；四条补录的发布记录（站内私信 / 全站搜索 / 成就时间线与每周热门 / 站长头衔）均在线可读；公告管理页分包 `announcements-BE--Vq78.js`（9.0K）含「新建公告」「运营通知」「存为草稿」「置顶」；`/admin/announcements` 返回 200；`GET /api/meta/about` 的 `version` 为 `1.2.0` 且 `launchDate` 存在（`FR-AUX-05`）。
- **文案口径修正（迁移 `017`）**：`016` 写入的状态公告摘要写着「暂无公示的未完成项」，而同一行正文明确列着「尚未开始：经验 / 签到 / 等级，完整治理后台与审核日志，验收与性能加固」——摘要与正文自相矛盾，右栏卡片只显示摘要。`017` 在**旧文案精确匹配时**才更新，日后运营者在后台的手动编辑不会被覆盖；同时正文追加「通知只在你收到评论时发出」，把范围收窄对用户讲明。
- **真实局限（如实标注）**：① 导出的总量上限问题仍在（见 `VR-M5-S4-01`），未做压测；② 私信为留言式，无实时推送、无未读红点，对方刷新或下次打开才可见；③ 成就解锁时间记的是判定时刻而非行为发生瞬间；④ 本轮线上验证止于接口与构建产物指纹，**未用真实账号在线上完成「点赞→评论→查通知」的完整交互回归**——线上登录态 E2E 仍属未验证项。

---

### M5.5 · 头衔与等级（站长授权头衔 / 经验 / `L1`–`L50` 等级 / 五段位）

**M5.5 状态：✅ 已收尾，随 `v1.4.0` 发布（2026-11-15）**。`M5.5-S1` 与 `M5.5-S2` 交付，`M5.5-S3` 取消。

**目标**：建立轻量、自动、非竞争性的成员成长与识别体系，适配小型邀请制社区的亲密氛围。两个子阶段均已交付：`M5.5-S1` 站长账号头衔预览（2026-11-15，见 `VR-M5.5-01`）、`M5.5-S2` 经验与等级（2026-11-15，见 `VR-M5.5-02`）。原 `M5.5-S3` 每日签到**经评审取消**（与 `FR-ACH-04` 冲突，理由见该节）。

**前置条件**：无。`M5.5-S1`（头衔）不依赖 `M5` 的私信 / 搜索，已与 `M5` 并行交付；`M5.5-S2`（经验 / 等级）复用 `shared/metrics.ts`，与成就模块共享指标口径。

> **调研依据（GitHub 开源参考，2026-11-15）**：
> - **Discourse**（GPL-2.0，Ruby/Rails/Postgres）：信任等级 `TL0–4`，`TL0–3` 全自动（按阅读 / 参与 / 100 天滚动活跃，`TL3` 可因活跃度下降而失去），`TL4`「领袖」仅限工作人员手动晋升；徽章分铜 / 银 / 金，自动或管理员手动授予，且「可作为用户头衔」。是「等级自动 + 站长手动授权特殊头衔」分离模式的最直接范本。
> - **Flarum / NodeBB / Apache Answer / HumHub**：均将等级、徽章、声望作为可扩展模块；NodeBB 有 karma/reputation，Apache Answer 有 reputation score，HumHub 有活动流与空间。
> - **签到 / 积分参考**：`IlluminateApp`（基础 10 分/日 + 连签倍率 + 周五加成 + 随机掉落）、`daily-checkin`（24 小时冷却、连签奖励、防重复）、`Motixion`（按行为自动算分）。
> - **设计哲学**（theopensourceway 指南 / GitHub gamification 研究 / community-building SKILL）：避免显性排行榜与过度竞争；积分 / 头衔应奖励真实参与；「头衔很廉价，真正的信任与权限才是阶梯」。对小型亲密社区，轻量、含蓄、非竞争性更合适——首交付物只做头衔预览，不引入积分榜。

#### `M5.5-S1` 站长账号头衔预览（首交付物） ✅ 已完成（2026-11-15）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M5.5-S1-T1` | 头衔数据模型 | 在 `users` 表增 `titles TEXT[]` 列（非单 `title` 列——支持多头衔并存），CHECK 约束钉死只允许 `community_leader` / `founder` / `admin` 三种枚举、并以 `UPDATE` 给现有站长账号回填三种头衔 | `migrations/012_user_titles.sql` | 迁移可重跑（幂等 `ADD COLUMN ... DEFAULT`）；非法枚举被约束拦截 |
| `M5.5-S1-T2` | 头衔读写 API | `PATCH /api/users/me/titles` 经 `requireRole(ROLE_ADMIN)` 守卫，仅站长可对自己账号设置 / 清除头衔；非站长返回 `FORBIDDEN`，非法枚举 / 非数组返回 `VALIDATION_FAILED`，服务层 `Set` 去重并保持稳定顺序 | `modules/users`（repository / service / controller / routes） | 见 `VR-M5.5-01` |
| `M5.5-S1-T3` | 预览前端 | 设置页（仅 `role === 'admin'` 渲染 `TitlesSection` 可勾选开关）、个人页署名、帖子 / 评论署名三处展示 `TitleBadges`；无头衔时不渲染、`feed`/`posts`/`profile` 三特性统一经 `features/users` 公共出口引用，满足 lint R1 边界 | `web/src/features/profile`、`web/src/features/users/TitleBadges.tsx` | 见 `VR-M5.5-01` |

> **首版头衔配色（按用户意图，已落设计令牌 `tokens.css`，亮 / 暗双主题）**：
> - 社区长 `community_leader`：金色 `#b8860b` / 暗 `#d9a441`——代表权力；
> - 创始人 `founder`：紫色 `#5b57d6` / 暗 `#918df2`——项目品牌色；
> - 管理员 `admin`：青色（teal）`#0d9488` / 暗 `#2dd4bf`——代表运维操作。
>
> **刻意不做的部分**（讲清取舍，非遗漏）：首版只做「站长自定义开空头衔」与「署名展示」，不做经验 / 等级 / 签到（`M5.5-S2` / `M5.5-S3`），不做任何基于头衔的权限提升（头衔纯展示，权限仍只由 `role` 决定），不做头衔排行榜。这一版解决的是「社区里有几个特殊身份的人能被一眼认出」，不是「成长体系」。

##### `VR-M5.5-01` · M5.5-S1 验证记录（通过）

- **环境**：本地 `node:test` + PGlite 内存真库（跑全部 `001`–`012` 迁移），`npm run verify` 全链路。
- **真实命令与输出**：
  - 新增 `server/tests/integration/titles.test.ts`，9 项断言覆盖：迁移 `012` CHECK 约束拒非法枚举 / 存合法数组；仅 `ROLE_ADMIN` 可写（非站长 `FORBIDDEN`）；非数组 / 非法 id 返回 `VALIDATION_FAILED`；服务层 `Set` 去重且顺序稳定；`getOwnProfile` / `getPublicProfile` 投影含 `titles`；帖子 / 评论作者 `titles` 透传、被擦除作者降级为 `[]`。
  - `npm run verify`：`typecheck` / `build`（2327 模块、`012` 迁移已随构建拷贝）/ `check:size`（245 文件在预算内）/ `lint`（硬规则 **0** 违规）/ `test`（**99** 项通过、**0** 失败）全绿。
- **断言对照**：服务层对 `titles` 做 `Set` 去重，repository 层不过滤——测试通过服务层 `updateOwnTitles(..., ex)` 验证去重，避免「测试另写一份 SQL」的假验证。
- **真实局限（如实标注）**：头衔展示依赖真实登录态下的个人页 / 信息流 / 评论渲染，无头浏览器静态路由挂载与单测已覆盖数据层与组件渲染，但**登录态下「设置页勾选 → 署名实时出现」的完整交互 E2E 未执行**，需真实后端 + 登录态复核。

#### `M5.5-S2` 经验与等级 ✅ 已完成（2026-11-15）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M5.5-S2-T1` | 经验换算 | **改为读时加权，不做累加写库**：复用 `shared/metrics.ts` 的七个指标（与成就同一份 SQL），按权重现算 | `server/src/shared/metrics.ts`、`level.rules.ts` | 权重与封顶由单测钉死 |
| `M5.5-S2-T2` | 等级与段位 | `L1`–`L50`，三段增量 20 / 40 / 60（`L50` = 2180 经验）；五段位萌新 / 入门 / 常客 / 老友 / 元老；**只升不降**，`users.top_level` 记历史最高 | `019_user_level.sql`、`level.service.ts` | 晋级落库、删帖不掉级 |
| `M5.5-S2-T3` | 等级前端 | 个人页等级牌（圆牌 + 段位 + 累计经验 + 说明）；**不画进度条、不写「还差多少」** | `web/src/features/level` | 桌面 / 移动截图复核 |

> **与原计划的一处偏离及理由**：本表原写「经验累加服务，由发帖 / 评论 / 被赞 / 访问天数等真实参与触发」。实际改成**读时现算**：① 累加要给发帖、评论、点赞三条写入链路各加一处调用，漏一处就长期少算，历史数据还得回填；② 与成就的「读时判定」同一套思路、同一份指标 SQL，不会出现「成就算你发过 3 帖、等级算你只发 2 帖」；③ 代价是一次聚合查询，成就模块已用同一形状的语句在线上跑过。
>
> **等级与「头衔」是两个词**：`users.titles`（社区长 / 创始人 / 管理员）继续叫头衔，指站长身份；等级区间叫**段位**。界面上两者配色也分开——头衔金 / 紫 / 青，段位石板灰蓝，成就陶土棕。

##### `VR-M5.5-02` · M5.5-S2 验证记录（通过）

- **测试**：`tests/unit/level-rules.test.ts` 15 项（门槛、边界、段位、权重与两个封顶、真实样本落档），`tests/integration/level.test.ts` 7 项（PGlite 真库：新成员 `L1`、晋级落库、删帖不掉级、已注销不展示资历、停用按不存在、库层拒 `0` / `51` 级）。全量 `npm test` 由 136 项增至 **158 项、`fail 0`**，`lint` 硬规则 0 违规，324 个源文件在行数预算内。
- **曲线校准（人工核算）**：轻度（3 帖 / 5 评论 / 30 天）= 100 经验 → `L6` 萌新；活跃（10 帖 / 30 评论 / 40 赞 / 60 天）= 415 → `L15` 入门；两年核心（50 帖 / 160 评论 / 300 赞）= 约 1960 → `L46` 元老。前 10 级每级 20 经验，保证新人两三天看到连续反馈。
- **库层**：`CHECK (top_level BETWEEN 1 AND 50)` 与 `MAX_LEVEL` 同源，越界写入被 `users_top_level_range` 拒绝（测试覆盖）。
- **真实局限**：① 未做独立等级页与升级动画（非需求）；② 未做等级排行榜（违反 `FR-ACH-04`）；③ 「等级 11、经验 0」这类组合是删帖后的真实状态，未做数值美化；④ 单次聚合查询未做压测，形状与成就页相同，按同一量级评估。

#### `M5.5-S3` 每日签到（**取消**，2026-11-15）

原计划为「`24h` 冷却 + 连签计数 + 连签奖励」。2026-11-15 的 `M5.5` 收尾评审发现它与需求基线**直接冲突**：

- `PRD.md` `FR-ACH-04`：「**不得**实现实时排行榜、**连续签到**、无限滚动等成瘾式机制」；
- `PRD.md` §11 需求追踪矩阵把「连续签到」列为**排除**项；
- 而本表原计划写的是「连签计数」「连签奖励」。

冲突提交作者拍板，结论是**保持 PRD 口径、取消签到**，理由：签到机制的核心驱动力就是连签与奖励，去掉这两样只剩一个「点一下」的按钮，价值不足以抵消成瘾设计与打扰成本；小社区成员本就是熟人来往，不需要打卡证明存在。原三条任务（`M5.5-S3-T1`—`T3`）整体作废，不再标注为「待做」——否则计划里会长期挂着一个不该做的功能。

**M5.5 交付物**：站长头衔预览（`M5.5-S1`）+ 经验与等级（`M5.5-S2`）已交付；每日签到（`M5.5-S3`）经评审取消并记录理由。

**M5.5 完成判据**：`M5.5-S1` / `M5.5-S2` 各有验证记录（`VR-M5.5-01` / `VR-M5.5-02`）；`DoD-01`—`DoD-10` 满足；头衔接口服务端校验角色；等级接口库层约束生效；`M5.5-S3` 的取消有书面理由而非留白。

**风险与回退**：头衔为单列 / 小表，可单独回退；等级为派生值，下线只需删 `modules/levels` 与前端组件，`top_level` 一列可留可删（删了不丢内容，只丢「历史最高」）；签到未建表，无历史数据需要清理。

---

### M6 · 管理后台、举报与内容治理

**M6 状态：✅ 已收尾，随 `v1.5.0` 发布（2026-11-16）**。六步全部交付，验证记录 `VR-M6-01` / `VR-M6-02` 通过。

**目标**：建立治理闭环，全部管理端点在服务端校验角色，动作可追溯。

**前置条件**：`M5.5` 完成；角色守卫与初始管理员可用。

> **现状（2026-11-15）**：`M6` 整体仍未开始，但「举报 + 申诉最小闭环」已提前以独立小步交付，见 `VR-M4-14`：迁移 `011_reports.sql`、`POST /api/reports` / `GET /api/reports/mine` / `GET /api/admin/reports` / `POST /api/admin/reports/:id/decision`，以及前端 `/reports`、`/admin/reports`。它只做提交、受理状态与答复，**不**做下表 `M6-S3` 的处置、审核日志、六分区后台与统计；`M6` 各子任务的目标与判据保持原样，未被这一小步满足。下表 `M6-S1-T1` 的 `reports` 表已由 `011` 落地（不含 `moderation_logs`），后续开工须在现有表上增补，不得新建同名迁移覆盖历史。

> **实施进度（分步推进，2026-11-16 完成）**：`M6` 按下表拆成六步逐步交付，每步跑通 `npm run verify` 再走下一步，六步已全部完成。
>
> - **步 1 · 治理数据模型 ✅**：迁移 `022_moderation.sql` 建 `moderation_logs`（只追加）+ `moderation_public_log`（脱敏视图），用 `ALTER` 给 `reports` 补 `reviewing` 状态与 `user` 目标类型。**偏差**：`M6-S1-T2` 计划里的 `weekly_highlights` 视图**不建**——「每周热门」现由 `achievement.repository.ts` 实时算且有测试，再建视图等于两套实现，违反项目「克制、防重复」硬规则；`moderation_public_log` 只投影动作类型 / 对象类型 / 时间，满足「不含操作者标识与内部备注」。
> - **步 2 · 审核日志接入举报处置 ✅**：新增 `moderation` 模块（`insertLog` / `listLogs`，无改删函数）；举报 resolve / dismiss 的「改状态 + 写日志」同一执行器原子提交，终态不可重决。**对应** `M6-S3-T5`。
> - **步 3 · 用户管理与内容管理 ✅**：用户列表 / 停用 / 恢复、内容列表 / 移除 / 恢复 4 端点，复用现有 `status` 字段、动作写日志、幂等防重复。**对应** `M6-S3-T2`、`M6-S3-T3`、`M6-S3-T5`；`M6-S3-T1` 由既有 `adminRouter` 满足并复核。
> - **步 4 · 话题管理与基础统计 ✅**：话题内聚 `topics` 模块，创建 / 编辑 / 归档（软删可恢复）+ 日志 + 幂等；`GET /api/admin/stats` 四数字纯 SQL 聚合、口径与前台一致、不引图表库。**对应** `M6-S3-T6`、`M6-S3-T8`。
> - **步 5 · 前端六分区 ✅**：`web/src/features/admin/` 六分区 + 既有举报 / 公告统一导航骨架，`RequireRole` 守卫，设置页加入口。**对应** `M6-S3-T7`。
> - **步 6 · 权限回归 + 文档同步 ✅**：见 `VR-M6-01` / `VR-M6-02`。**对应** `M6-S4`。
> - **仍未做的规划项**：`reviewing` 状态数据层已就绪，但**服务层启用 + 前端「复核中」按钮未做**——举报队列仍是三态（pending / resolved / dismissed），按既定口径留到后续增强，不把数据层能力写成已交付。不当行为（`user` 目标）举报同理：迁移已支持，实际举报服务仍只做帖子 / 评论目标。

#### `M6-S0` 社区公告管理 ✅ 已完成（2026-11-15）

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M6-S0-T1` | 公告入库 | 迁移 `016_announcements.sql` 建 `announcements`，只承载「当前状态」与「运营通知」；发布记录仍随代码走。`status` 与 `published_at` 由 `CHECK` 绑死成对变化 | `migrations/016_*.sql` | 草稿不外泄；发布必有时间 |
| `M6-S0-T2` | 读写接口 | 公开 `GET /api/meta/announcements` 改三段式（置顶 / 通知 / 档案）；管理端 `POST` / `PATCH` / `DELETE` 挂在既有 `adminRouter` 守卫之后 | `modules/announcements/` | 非管理员 401/403；软删除保留行 |
| `M6-S0-T3` | 后台界面 | `/admin/announcements`：新建、编辑、存草稿、发布 / 撤回、置顶、删除；入口在「设置 → 运营管理」 | `web/src/features/announcements/` | 改完回前台立即可见 |

> **为什么单独开 `M6-S0` 而不并入 `M6-S3`「管理后台」**：公告管理不涉及内容处置、封禁与权限模型，是一块独立、低风险的运营能力。先交付它，能让「公告滞后于功能、甚至写着与事实相反的话」这个真实问题立刻停下，不必等完整治理后台。分层口径（档案 / 状态 / 通知）见 `ARCHITECTURE.md §6.2`。

#### `M6-S1` 治理数据模型

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M6-S1-T1` | 举报与日志表 | `NNN_reports_moderation.sql` 建立 `reports`、`moderation_logs` 及索引 | `migrations/NNN_*.sql` | 状态枚举与检查约束正确 |
| `M6-S1-T2` | 公开视图 | `NNN_views.sql` 建立 `weekly_highlights` 与 `moderation_public_log` 脱敏视图 | `migrations/NNN_*.sql` | 公开视图不含操作者标识与内部备注 |

#### `M6-S2` 举报链路

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M6-S2-T1` | 举报 API | 提交（目标类型 + ID + 原因 + 说明）、我的举报列表 | `modules/reports/` | 伪造目标 ID 被拒 |
| `M6-S2-T2` | 目标校验 | 服务层校验目标存在性与可见性 | 同上 | 不存在 / 不可见目标被拒 |
| `M6-S2-T3` | 前端入口 | 帖子、评论、行为三处举报入口与表单 | `web/src/features/report/` | 提交后显示受理状态 |

#### `M6-S3` 管理后台与处置

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M6-S3-T1` | 角色校验复核 | 全部 `/api/admin/*` 统一挂载角色中间件，服务层二次复核 | `modules/admin/`、`app.ts` | `AC-11` 有记录，绕过前端直调被拒 |
| `M6-S3-T2` | 用户管理 | 列表、停用 / 恢复；不提供公开管理员注册 | `modules/admin/` | 状态变更写入日志 |
| `M6-S3-T3` | 内容管理 | 帖子与评论列表（含已移除）、移除 / 恢复 | 同上 | 处置后公开可见性同步变化 |
| `M6-S3-T4` | 举报复核 | 队列、复核、处置、驳回，状态流转符合 PRD §4.12 | `modules/moderation/` | `AC-12` 有记录 |
| `M6-S3-T5` | 审核日志 | 每个动作写入 `moderation_logs`，只追加 | 同上 | 日志不可被普通用户改写 |
| `M6-S3-T6` | 基础统计 | 用户数、帖子数、评论数、待处理举报数，数值卡片 + 简易条形 | `web/src/features/admin/` | 不引入图表库依赖 |
| `M6-S3-T7` | 后台六分区 | 用户 / 帖子 / 评论 / 话题 / 举报 / 统计的独立路由与页面 | 同上 | 六分区均可达，视觉与全站一致 |
| `M6-S3-T8` | 话题管理 | 创建、编辑、归档（管理员） | `modules/topics/` 管理端点补齐 | 操作写入日志 |

#### `M6-S4` 权限回归

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M6-S4-T1` | 越权矩阵检查 | 逐一以访客 / 普通用户 / 管理员身份请求全部受保护端点 | 验证记录 | 结果与 PRD §3.2 权限矩阵一致 |
| `M6-S4-T2` | 前端入口核对 | 确认不存在仅靠隐藏按钮实现的功能差异 | 同上 | 无隐藏式权限控制 |

**M6 交付物**：管理后台六分区、举报与处置链路、审核日志与公开脱敏视图、权限回归记录。

**M6 完成判据**：`AC-11`、`AC-12` 有验证记录；`DoD-01`—`DoD-10` 全部满足；全部管理端点均有角色校验。

**风险与回退**：治理动作影响内容可见性，须在测试库完成回归后再合入；处置逻辑集中在 `moderation` 服务，可单独回退。

##### `VR-M6-S0-01` · M6-S0 社区公告分层与管理验证记录（通过）

- **环境**：`node:test` + PGlite 内存真库（跑全部 `001`–`016` 迁移）；另起本地 PostgreSQL 16 + 真实管理员会话 + 无头 Chromium 做端到端。
- **发现的真实问题（改造的直接动因）**：① 11-15「举报与申诉」公告里写着「私信仍在开发中」——私信 M5-S1 早已交付，属于**对外错误信息**；② `2026-11-14` 的「当前进度与已知问题」被反复改写，摘要仍写「数据导出仍未开始」，而「未完成」清单里也只剩这一项；③ 私信、搜索、成就与每周热门、头衔四个功能**没有独立公告**，只在进度条里被一句「已交付，从缺口清单移出」带过。根因是三种性质（档案 / 状态 / 通知）共用同一套结构与同一份代码常量。
- **方案取舍**：不做「全量入库」——那会让历史档案可被随意改写，且新环境部署时公告默认为空。改为**分层**：发布记录留代码（无写入口），当前状态与运营通知入库。代价是两处数据源，故在服务端拼成一个三段式响应，前端只渲染一套。
- **数据层保障**：`CHECK ((status='published') = (published_at IS NOT NULL))` 让「发布了没时间」「草稿当已发布」在库层不可能；`resolvePublishedAt` 只在「首次发布」时取当前时刻，编辑标题不刷新——否则改错别字等于篡改日期。
- **真实命令与输出**：`npm run verify` 全绿（**134** 项测试、lint 硬规则 **0** 违规、311 个源文件在预算内）。新增 `announcements.test.ts` 7 项：迁移种子带来置顶「当前进度」且代码档案里不再重复、草稿不出现在公开接口、发布补时间 / 撤回清空、改标题不改发布日期、置顶排序与取消、软删除后两处均不可见但行仍在、删除不存在项报 `NOT_FOUND`。`about-doc.test.ts` 的真源由「代码里的 status 条」改为「迁移 016 的种子 SQL」，6 项断言重写后通过。
- **端到端实测**：匿名 `GET /api/meta/announcements` → `pinned`(1) + `notices`(0) + `history`(17)，`history` 不含「当前进度」；未登录访问 `/api/admin/announcements` → `401`；建草稿 → 公开列表搜不到 → `PATCH status=published` → 出现在 `notices` → 置顶后排到 `pinned` 首位；`kind=bogus` → `400`，空标题 → `400 VALIDATION_FAILED`；`DELETE` → `200` 且公开列表消失。界面层：管理页点「新建公告」→ 填标题 / 摘要 / 正文 → 选「立即发布」→ 保存 → 列表出现该条（带「通知 / 已发布」标签）→ 回前台确认它落在「运营通知」段、置顶项仍在最前、右栏卡片仍显示置顶那条；桌面 1440 截图复核三段式与四个操作按钮，无错乱。
- **真实局限（如实标注）**：① 公告正文是纯文本按行拆分，**不支持富文本或 Markdown**——这是刻意的（避免消毒与 XSS 面），代价是写不了加粗、链接与列表嵌套；② 没有版本历史与草稿协作，改错只能靠人记住原话（软删除只保留下架条目，不保留每次编辑的旧版本）；③ 没有定时发布与公告已读；④ 线上（Vercel）尚未验证。

##### `VR-M6-01` · M6 六步质量门与功能验证记录（通过）

- **环境**：`node:test` + PGlite 内存真库（跑全部 `001`–`022` 迁移）。
- **真实命令与输出**：`npm run verify` 全绿——**206** 项测试、`fail 0`，`typecheck` / `build` / `check:size` / `lint` 全过，新增源码均在行数预算内。各步新增：步 1 `moderation-schema.test.ts` 14 项（约束 / 脱敏视图 / 新状态目标 / 历史约束未回退）、步 2 `moderation-log.test.ts` 5 项（留痕 / 终态不重决 / 系统动作 / 键集翻页）、步 3 `admin-moderation.test.ts` 9 项（列表 / 停用恢复 / 移除恢复 / 计数联动 / 越权 / 不存在 / 幂等）、步 4 `admin-topics-stats.test.ts` 8 项（话题增删改归档 + 日志 + 幂等 / 统计口径）。
- **端到端实测（本地 PostgreSQL 16 + 真实管理员会话 + 无头 Chromium）**：桌面 1440 六分区页面截图复核，导航 / 统计卡 / 用户 / 话题列表无错乱；停用成员 → 统计帖子数 `60 → 20`（其 40 篇从前台可见范围消失）→ 恢复回 `60`，证明「停用 → 内容隐藏 → 可恢复」联动真实生效且不改数据。
- **真实局限（如实标注）**：① `reviewing` 状态数据层已就绪，但服务层与前端未启用，举报队列仍三态——按既定口径留待增强，不把数据层能力写成已交付；② 不当行为（`user` 目标）举报迁移已支持，实际举报服务仍只收帖子 / 评论目标；③ 步 1–3 曾于 `3f8c30e` 单独推送，步 4–6 与本次文档同步的线上部署状态以实际为准；④ 质量门为本地验证，非线上 E2E。

##### `VR-M6-02` · M6 权限回归验证记录（通过）

- **目标**：`AC-11`（普通用户无法访问管理端点）、`AC-12`（管理员处置内容并留痕）；对照 `PRD.md` §3.2 权限矩阵与 §4.13 `FR-ADMIN-02/06`。
- **环境**：本地 PostgreSQL 16 + 无头 Chromium，三类身份（访客 / 普通用户 `starpal_demo` / 管理员 `admin_test`）经真实登录态请求 12 个 `/api/admin/*` 端点。
- **真实命令与输出**：访客对 12 端点（whoami / users 列表与改状态 / content 列表与改状态 / topics 增删改归档 / stats / reports / announcements）**全部返回 `401`**；普通用户对同 12 端点**全部返回 `403`**，无一遗漏。证明 Router 级统一挂载的 `requireAuth + requireRole(ROLE_ADMIN)` 覆盖全部管理端点，且服务层另有二次复核（服务层单测已验证非管理员被拒）。
- **AC-12 留痕实测**：管理员创建话题 → `moderation_logs` 出现 `topic.create`；归档 → 出现 `topic.archive`；此前停用 / 恢复成员各产生 `user.suspend` / `user.restore`。处置与日志一一对应。
- **前端入口核对（`M6-S4-T2`）**：管理页面均包在 `RequireRole` 内，普通用户敲 `/admin/*` 地址被友好挡回首页；权限判定始终以服务端为准，前端守卫只是体验层。
- **真实局限（如实标注）**：本轮为本地验证，线上（Vercel）权限回归以实际部署后为准。

---

### M7 · 测试、加固、文档与交付验收

**M7 状态：🚧 进行中**（第一批 2026-11-16 完成：`S1-T4` / `S1-T5` / `S2-T2` / `S2-T6`，见 `VR-M7-01`；第二批同日完成：`S1-T6` 前端测试体系、覆盖率门槛与 CI 门禁，见 `VR-M7-02`；第三批同日完成：`S1-T8` 组件与路由冒烟、`S1-T9` 数据库不变量，见 `VR-M7-03`；第四批同日完成：`S2-T3` 查询检查与索引支撑断言，见 `VR-M7-04`；第五批 2026-11-16 完成：`S2-T1` 三态巡检、`S2-T4` 图片检查，见 `VR-M7-05`；第六批同日完成：`S2-T5` 无障碍三项缺陷修复并复验通过，见 `VR-M7-06`；第七批 2026-11-17 完成：`S2-T7` 清理任务结论、`S3-T1…T8` 部署文档一致性核对，见 `VR-M7-07`；第八批同日完成：`S4-T1…T5` 全量验收汇总，见 `VR-M7-08`）。

**目标**：完成质量加固、文档齐备与全量验收，形成可交付版本。

**前置条件**：`M6` 完成；功能冻结。

> **开工前的范围决定（作者拍板，2026-11-16）**：`M6` 遗留的两个缺口——举报「复核中」状态、举报对象支持「人」——**不在 `M7` 内补做**。`M7` 的定位是验收加固，功能冻结期加功能会让 `M6` 的验收记录需要重开。两项写入 `M7-S3-T6` 已知限制清单，留给后续版本。

#### `M7-S1` 自动化测试

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M7-S1-T1` | 单元测试 | 排序权重、游标编解码、校验规则、错误映射、计数事务（✅ 校验规则已随 `M4` 提前落地） | `server/tests/unit/` | `test` 通过，覆盖关键纯逻辑 |
| `M7-S1-T2` | API 集成测试 | 注册 / 登录 / 发帖 / 点赞 / 评论 / 举报 / 管理端点，使用独立测试库（✅ 迁移与结构约束测试已提前落地，PGlite 每次全新建库） | `server/tests/integration/` | 每次执行前迁移并清理 |
| `M7-S1-T3` | 端到端检查 | 关键路径：注册 → 发帖 → 互动 → 举报 → 处置 → 导出 | `tests/e2e/` | `test:e2e` 通过 |
| `M7-S1-T4` | 上传安全用例 | 伪造扩展名 / MIME、超限、含 EXIF 的样例（✅ 2026-11-16 完成） | `tests/unit/image-pipeline.test.ts`（8 项，EXIF / SVG / HTML / GIF / 魔数不符 / 空文件）、`tests/integration/upload-guard.test.ts`（5 项，401 / 字段名 / 413 / 415 / 成功转 WebP） | 全部被拒或净化；EXIF 含 GPS 样本处理后无残留 |
| `M7-S1-T5` | 权限回归自动化 | 将 `M6-S4` 矩阵检查转为可重复用例（✅ 2026-11-16 完成） | `tests/helpers/http.ts`（真 Express 链路 + PGlite）、`tests/integration/admin-permissions.test.ts`（路由清单从 `adminRouter.stack` 现取） | 与手工记录一致；变异实验证明移除守卫即失败 |
| `M7-S1-T6` | 前端测试体系 | 前端此前零测试；建 vitest + jsdom + Testing Library 地基并覆盖纯逻辑层（✅ 2026-11-16 完成） | `web/vitest.config.ts`、`web/tests/setup.ts`、`web/tests/lib/*.test.ts`（6 个文件 48 项）、`web/tsconfig.test.json` | `npm test` 通过；`src/lib/**` 覆盖率 100% 行 / 98.46% 分支 |
| `M7-S1-T7` | 覆盖率门槛与 CI | 覆盖率接入质量门 + GitHub Actions 每次推送自动跑（✅ 2026-11-16 完成） | `server/package.json`（`test:coverage`）、`web/vitest.config.ts`（阈值）、`.github/workflows/verify.yml` | 门槛生效：后端 85.63/79.11/68.47 对 84/78/66；前端 100/98.46/100 对 95/90/95 |
| `M7-S1-T8` | 组件与路由冒烟 | 前端补登录 / 三态 / 后台成员页组件测试；后端每个端点至少过一次真实 HTTP（✅ 2026-11-16 完成） | `web/tests/features/auth/AuthForm.test.tsx`(20)、`web/tests/features/admin/AdminUsersPage.test.tsx`(8)、`web/tests/components/States.test.tsx`(5)、`server/tests/integration/routes-smoke.test.ts`(49) | 停用二次确认、开放重定向防护、普通成员改他人帖 403 均有断言 |
| `M7-S1-T9` | 数据库不变量 | 迁移编号规范、空库建表完整性、事务提交 / 回滚语义（✅ 2026-11-16 完成） | `server/tests/integration/db-invariants.test.ts`(7) | 回滚后无残留；角色名稳定 |

#### `M7-S2` 错误、性能与加固

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M7-S2-T1` | 错误态巡检 | 全站加载 / 错误 / 空三态逐一复现（✅ 2026-11-16 完成，见 `VR-M7-05`） | 验证记录 `VR-M7-05` | `AC-15` 有记录：三态齐备，错误态需等重试退避约 4 秒才出现 |
| `M7-S2-T2` | 错误信息审查 | 确认无堆栈、SQL、内部路径外泄（✅ 2026-11-16 完成） | `tests/integration/error-envelope.test.ts`（模拟数据库异常 + 领域错误 + 404 + 响应头） | 错误响应符合统一包络；人工审查 `DomainError` 动态文案均为常量插值 |
| `M7-S2-T3` | 查询检查 | 信息流与列表无 N+1；索引命中符合 §7.4（✅ 2026-11-16 完成） | `tests/integration/query-shape.test.ts`（8 项：单次请求的 SQL 条数不随条目数增长；12 条索引定义断言；3 条 `EXPLAIN` 断言）；`VR-M7-04` 查询计划记录（PGlite 按真实量级播种后逐条打印） | 无 N+1；索引被删或被改列顺序即失败；两处未被使用的索引有说明与处置 |
| `M7-S2-T4` | 图片检查 | 懒加载、尺寸预留、无横向溢出、多断点缩放（✅ 2026-11-16 完成，见 `VR-M7-05`） | 同上 | 四个断点逐一检查：`loading=lazy`、`decoding=async`、`width/height` 均带、四档均无横向溢出 |
| `M7-S2-T5` | 无障碍检查 | 语义角色、键盘导航、对比度、表单标签（✅ 2026-11-16 修复后复验通过，见 `VR-M7-06`） | `tests/features/feed/FeedTabs.test.tsx`、`tests/lib/feed-a11y.test.ts`；`VR-M7-05` 首轮 + `VR-M7-06` 复验记录 | `NFR-A11Y-*` 逐项有结论：对比度浅 / 深两套主题六个页面组合 0 违规；两处 critical ARIA 已消除并加回归用例 |
| `M7-S2-T6` | 凭据扫描 | 全仓库扫描密钥、口令、邀请码明文（✅ 2026-11-16 完成） | `scripts/scan-secrets.mjs`（7 条规则 + `.env` 入库检查 + `--history`），已接入 `verify` 成为第六道门禁 | `AC-18` 有记录：547 文件 0 命中、87 提交全历史 0 命中 |
| `M7-S2-T7` | 清理任务 | 过期会话、过期安全事件清理（✅ 已核对，见 `VR-M7-07`）；孤儿文件清理**不适用**——图片字节与元数据同事务提交，架构上不产生孤儿 | `pruneExpiredData()` + `VR-M7-07` | 保留期符合配置；不适用项有说明 |

#### `M7-S3` 部署文档与交付清单

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M7-S3-T1` | 环境变量文档 | 完整变量表、必填项、默认值、安全级别（✅ 2026-11-17 核对，见 `VR-M7-07`） | `docs/DEPLOYMENT.md` §4 | 与 `config/env.ts` 一致；修正"校验产物目录可读"的不实描述 |
| `M7-S3-T2` | 数据库配置说明 | 实例准备、账号、迁移、种子、备份与恢复（✅ 文档一致性核对；空环境复现留待 `S4-T4`） | `docs/DEPLOYMENT.md` §5 / §10 | 文档描述核对通过；**未在全新空环境从零复现**，不写成已完成 |
| `M7-S3-T3` | 启动说明 | 开发 / 构建 / 单进程启动 / 反向代理与 TLS（✅ 2026-11-17 核对，见 `VR-M7-07`） | `docs/DEPLOYMENT.md` §7–§9、`README.md` | 脚本名与 `package.json` 一致；修正启动顺序中的孤儿文件清理与"任务"表述 |
| `M7-S3-T4` | 已实现功能清单 | 对照 PRD §9.1 逐项标注状态（✅ 2026-11-17 核对，见 `VR-M7-07`） | `README.md` | 修正迁移范围 `001`–`019` → 当前至 `023`；「十个话题含闲聊」核对后正确，保留 |
| `M7-S3-T5` | 待配置清单 | 见 §8，逐项写明由部署方完成（✅ 2026-11-17 核对） | `docs/DEPLOYMENT.md` §13 | 10 项均有对应章节，无隐含依赖 |
| `M7-S3-T6` | 已知限制清单 | 见 §9，与 PRD §10 / 架构 §12 一致（✅ 2026-11-17 核对，见 `VR-M7-07`） | README / `PRD` / `ARCHITECTURE` | 修正架构 §11 孤儿文件清理、§13 质量工具两项表述 |
| `M7-S3-T7` | 变更记录 | 汇总全里程碑变更，代码与文档同步（✅ 2026-11-17 核对） | `CHANGELOG.md` | 三处 `package.json` + `APP_VERSION` + CHANGELOG 均为 `1.5.0`，一致 |
| `M7-S3-T8` | 演示内容复核 | 标注清晰、空态不被掩盖（✅ 2026-11-17 取证，见 `VR-M7-07`） | 验证记录 `VR-M7-07` | `AC-17` 通过：种子脚本不插演示帖，空态是真空态；附 `is_demo` 未过滤的边界待办 |

#### `M7-S4` 全量验收

| 编号 | 任务 | 具体动作 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| `M7-S4-T1` | 验收项执行 | 按 §6 逐条执行 `AC-01…18`，记录命令与真实输出（✅ 2026-11-17 完成，见 `VR-M7-08`） | 验证记录汇总表 `VR-M7-08` | 18 项：17 通过、`AC-17` 通过附边界，无未通过 / 未验证 |
| `M7-S4-T2` | 视觉一致性回归 | 全站页面逐一检查令牌、组件、玻璃使用范围（✅ 2026-11-17 完成） | 同上 | `AC-14` 通过：6 页 × 7 令牌唯一值数均 1 |
| `M7-S4-T3` | 移动端回归 | 四个断点、触摸目标、无横向溢出（✅ 复用 `VR-M3-18` / `VR-M7-05`） | 同上 | `AC-13` 通过：24 次测量零溢出 |
| `M7-S4-T4` | 构建与启动回归 | 干净环境执行 `build` → `migrate` → `start` → 健康检查（✅ 2026-11-17 完成） | 同上 | 空库 `starpal_s4` 全程无人工修补 |
| `M7-S4-T5` | 交付归档 | 汇总源码、迁移、文档、验证记录、清单（✅ 2026-11-17 核对） | 交付物清单 §7 | 与 §7 一致（迁移编号已按目录实际改为 001–023） |

##### `VR-M7-01` · 第一批（自动化测试 + 凭据扫描）验证记录（通过）

- **目标**：`AC-11`（管理端点权限）、`AC-18`（仓库无明文凭据）转为可重复用例；`M7-S1-T4` 上传安全用例、`M7-S2-T2` 错误信息审查。
- **环境**：`node:test` + PGlite 内存真库（全部迁移）+ 真实 Express 链路（`http.createServer(createApiApp())`，随机端口，`fetch` 请求）。
- **做法**：`tests/helpers/http.ts` 把 `pool.query` / `pool.connect` 接到内存库上，中间件、控制器、仓储、事务全部走真实代码路径，只是把 PostgreSQL 换成 PGlite。没有为测试改造生产代码。
- **真实命令与输出**：`npm run verify` 全绿——测试由 **206** 增至 **227** 项、`fail 0`；`typecheck` / `build` / `check:size`（350 个源文件）/ `lint`（硬规则 0 违规）/ `scan:secrets` 全过。
- **`AC-11` 覆盖范围**：路由清单从 `adminRouter.stack` 现取，当前 14 条直连路由 + `announcements` 子路由 4 条，共 18 个端点 × 三类身份。访客全部 `401 AUTH_REQUIRED`，普通成员全部 `403 FORBIDDEN`，管理员不被守卫拦下（返回 200 或 400 取决于入参）。
- **变异实验（证明用例不是空转）**：临时注释掉 `adminRouter.use(requireAuth, requireRole(ROLE_ADMIN))` → 该测试 4 项**全部失败**；还原后 4 项全部通过。`git diff` 确认生产代码零改动。
- **`AC-18` 实测**：`node scripts/scan-secrets.mjs` → 检查 547 个文件、7 条规则、未发现明文凭据；`--history` 扫 87 个提交的变更历史，0 条规则命中；`git ls-files` 确认 `.env` 未入库，仅有 `.env.example` 占位符。
- **真实局限（如实标注）**：① 内存库的 `BIGINT` 回读是 `number`，而生产 `pg` 回读是 `string`，「是否作者」的比对在夹具下会误判，故上传成功用例改用管理员身份走通（错误码类用例不受影响）；② 凭据扫描只覆盖已知模式，无法证明「不存在任何未知形态的密钥」；③ 本轮为本地验证，线上以部署后实际为准。

##### `VR-M7-02` · 第二批（前端测试体系 + 覆盖率门槛 + CI）验证记录（通过）

- **目标**：`M7-S1-T6` 前端测试地基、`M7-S1-T7` 覆盖率门槛与 CI 门禁。
- **环境**：`vitest 5.1.0` + `jsdom 29.1.1` + `@testing-library/react 16.3.3`；后端 `node --import tsx --test` + Node 22 内置覆盖率（`--experimental-test-coverage`）；CI 为 GitHub Actions（public 仓库，标准 runner）。
- **真实命令与输出**：`npm run verify` 全绿——测试 **275** 项（后端 227 + 前端 48）、`fail 0`；`typecheck`（含新增的 `web/tsconfig.test.json`）/ `build` / `check:size` / `lint` / `scan:secrets` 全过。
- **覆盖率实测（连续两次一致，非取样一次）**：后端 `src/**` 行 85.63 / 分支 79.11 / 函数 68.47；前端 `src/lib/**` 行 100 / 分支 98.46 / 函数 100。门槛取实测下方留余量（后端 84/78/66，前端 95/90/95），作用是防倒退。
- **为什么前端只统计 `src/lib/**`**：尚未测的页面若计入分母，总数会被稀释成没有指导意义的百分比，反而掩盖真实覆盖情况。组件测试落地后逐目录纳入，门槛随之上调。
- **测试代码也做类型检查**：`tsc` 默认不检查 `web/tests/`，专门加 `tsconfig.test.json`——否则测试文件可以带着类型错误通过，等于把「测试通过」变成虚假保证。
- **如实标注的短板**：① 后端函数覆盖 68.47%，根因是多数模块的集成测试直接调 service、未走 controller，HTTP 入口只被管理端点那批用例覆盖；已在下一批（路由级冒烟）列为首要补强项，不靠调低门槛掩盖。② `theme.ts` 的 `typeof window === 'undefined'` 分支在 jsdom 下不可达（SSR 保护），保持未覆盖并在此登记。③ 前端目前只测到纯逻辑层，组件与交互仍未覆盖。
- **CI 的边界**：只做门禁不做部署（部署归 Vercel），CI 内零凭据（PGlite 内存库、不读 `.env`），权限 `contents: read`。首次线上运行结果待推送后观察，见下一次验证记录。

##### `VR-M7-03` · 第三批（组件测试 + 路由冒烟 + 数据库不变量）验证记录（通过）

- **目标**：补齐前端组件层，补齐后端控制层，给数据库地基单独一层断言。
- **真实命令与输出**：`npm run verify` 全绿（退出码 `0`）——测试 **364** 项（后端 283 + 前端 81）、`fail 0`；`typecheck`（含 `tests/`）/ `build` / `check:size`（350 文件）/ `lint` / `scan:secrets`（562 文件 0 命中）全过。
- **覆盖率实测**：后端 `src/**` 行 92.09 / 分支 73.56 / 函数 88.87（对比第二批 85.63 / 79.11 / 68.47——行与函数大幅上升，分支百分比下降是因为此前未加载的文件不进分母，现在被真实执行并暴露了未覆盖分支）；前端 行 98.84 / 分支 94.83 / 函数 97.87。门槛随之上调为 91/72/87 与 95/90/95。
- **两个夹具缺陷（本轮最有价值的产出）**：
  1. `int8` 类型解析不一致——`pg` 返回字符串、PGlite 返回 number，「是不是作者」的判断（`String(authorId) === viewer.id`）在内存库下恒为假，**本人改自己的帖子被判 403**。此前靠「用管理员身份上传」绕开，属于用测试掩盖问题；本轮改为对齐 PGlite 的 `parsers`（OID 20 → 字符串），并把绕开的用例改回作者本人。
  2. `rowCount` 换算错误——PGlite 对 SELECT 返回 `affectedRows: 0`，原写法把它当行数，导致 `rowCount === 0` 一律成立，发帖在测试里永远「话题不存在」。改为「先看行数，再看影响行数」。
- **`AC-11` 之外的权限补充**：普通成员改他人帖子 403、未登录访问 `/api/auth/me` `/api/users/me` `/api/notifications` `/api/export` 统一 `AUTH_REQUIRED`、无效会话不被当成登录态。
- **真实局限**：① 分支覆盖 73.56% 仍是弱项，缺口在异常分支，继续补需要构造大量非常规输入；② 前端只覆盖 3 个组件文件，治理后台其余五页、发帖器、图片选择器仍未测；③ 路由冒烟只断言「2xx + 包络」，业务正确性依赖各模块自己的集成测试，两者不重复。

##### `VR-M7-04` · 第四批（查询形状与索引支撑）验证记录（通过）

- **目标**：`M7-S2-T3`——证明列表页的**数据库往返次数不随条目数增长**（无 N+1），并核实 §7.4 的索引策略与实际库一致、关键查询确实走索引。
- **环境**：`node:test` + PGlite 内存库（全部 23 个迁移）+ 真实 Express 链路。查询计划另按真实量级播种后取：50 用户 / 3000 帖 / 6000 图文 / 12000 评论 / 9000 赞 / 2000 收藏 / 3000 通知 / 400 举报 / 49 会话 / 6000 消息 / 5000 安全事件，`ANALYZE` 后 `EXPLAIN`。
- **真实命令与输出**：`npm run verify` 全绿（退出码 `0`）——测试 **372** 项（后端 291 + 前端 81，较第三批 364 增 8）、`fail 0`；`typecheck` / `build` / `check:size`（350 文件）/ `lint` / `scan:secrets` 全过。后端覆盖率 行 92.32 / 分支 73.61 / 函数 89.35，前端 行 98.84 / 分支 94.83 / 函数 97.87。
- **N+1 的证法**：不数代码里有几个 `await`，而是数**真实经过连接池的 SQL 条数**（`tests/helpers/http.ts` 新增只读日志 `sqlLog`，只记文本不记参数）。同一条请求返回 5 条与 25 条时，SQL 条数必须相等；「相等」前先断言计数大于 0，避免统计链路失效时退化成 `0 === 0` 的假通过。五条链路全部相等：信息流 latest / popular / recommended、详情页（1 张图 vs 6 张图）、评论线程（2 条 vs 12 条）、通知列表（2 条 vs 30 条）。另加一条结构断言：单次信息流请求里 `FROM posts` 只出现一次。
- **变异实验（证明用例有牙齿）**：临时在 `post.service.ts` 的 `listFeed` 里对每条结果补一次 `findPostById`，该组 **3 项全部失败**；还原后全通过。`git diff` 确认生产代码零改动——只改了测试夹具与新增测试文件。
- **索引支撑**：12 条期望索引按 `pg_indexes` 的**实际定义**逐片段比对（列顺序、`WHERE` 条件、`UNIQUE` 属性）。另有 3 条 `EXPLAIN` 断言守住「排序有索引可依」：最新流用 `posts_latest_idx`、评论用 `comments_post_idx`、通知用 `notifications_user_idx`。
- **查询计划实测（按上表量级）**：最新流 `Index Scan using posts_latest_idx`；作者列表 `Index Scan using posts_author_idx`；评论 `Bitmap Index Scan on comments_post_idx`；通知 `Index Scan using notifications_user_idx`；举报队列 `Index Scan using reports_queue_idx`；我的举报 `reports_mine_idx`；我的点赞 `likes_user_idx` + `posts_pkey` 嵌套循环；消息 `Index Scan Backward using messages_conversation_idx`；限流窗口统计 `Index Only Scan using security_events_lookup_idx`。图片聚合在同一语句内以相关子查询完成，走 `post_images_post_sort_unique`。
- **发现一：两条索引存在但在当前查询形态下用不上**。① `posts_popular_idx (like_count DESC, created_at DESC)`——热点排序的键是**计算出的综合分**，btree 无法提供该顺序，查询实际按时间窗口走 `posts_latest_idx` 取范围再排序；② `posts_topic_idx (topic_id, created_at DESC, id DESC)`——话题过滤写的是 `t.slug = $1`（与 `topics` 联表），规划器只能当 join filter，首屏走的是 `posts_latest_idx`。**处置：本轮不删、不改为 hint**。删除属结构变更且收益是可忽略的写放大；改用 `slug → id` 预解析再按 `topic_id` 过滤，收益在当前量级（3000 帖）测不出来，却要改信息流 SQL 与游标语义，属功能冻结期不该做的改动。两条索引在 `ARCHITECTURE §7.4` 已按「预留、当前不被使用」如实标注，避免下次有人以为它们在生效。
- **发现二：收藏列表在该量级下走 `posts` 全表 Hash Join**（cost 88.50 / 3000 行），点赞列表则走嵌套循环。原因是收藏条数（40）与帖子数（3000）的估算比值让规划器判定「先扫小表再哈希」更便宜。**处置：不处置，记为已知代价**——代价随 `posts` 行数线性增长，触发条件是该表超过约 1 万行且收藏列表进入热点路径；届时按实际慢查询日志决定是否改写为 `LIMIT` 驱动的嵌套循环。此处**未做计时实测**，只记录计划与代价估算，不写成「已验证性能达标」。
- **文档纠偏**：§7.4 原表把评论索引写成 `comments (post_id, created_at)`、通知索引写成 `notifications (user_id, is_read, created_at DESC)`，与实际定义不符（前者是带 `id DESC` 与部分条件的三列索引，后者是 `notifications_user_idx` 与 `notifications_unread_idx` 两个索引）。本轮按 `pg_indexes` 实际定义重写该表，并注明「表以实际定义为准，由测试守门」。
- **真实局限**：① 播种数据在内存库中，统计信息与生产 PostgreSQL 的分布不同，计划可能不同——本轮能证明的是「索引存在且对应该查询形态」，不能证明生产上一定选中它；② 分支覆盖率在同日的另一次运行中曾出现 76.43（本次 73.61），差异来源**未定位**；此后连续四次运行均为 73.61，门槛 72 按低值设定，余量仅 1.6 个百分点，存在偶发触线的风险，已记入待办而非调低门槛；③ 本轮覆盖的是「读路径」的往返次数，写路径（发帖 / 评论 / 点赞）的事务条数由各模块集成测试覆盖，不在此重复。

##### `VR-M7-05` · 第五批（三态、图片、无障碍：前两项通过，无障碍未通过）验证记录

- **目标**：`S2-T1` 三态巡检、`S2-T4` 图片检查、`S2-T5` 无障碍检查；顺带为 `AC-15`（三态完备）与 `AC-13`（移动端布局）取证。
- **环境**：本地 PostgreSQL 16 + 全部 23 个迁移 + 演示数据（9 帖，一帖带真实上传图片：2400×1600 PNG 经管线上传转 WebP 2048×1365）；无头 Chromium（Playwright 1.58.1）；四档视口 390 / 768 / 1024 / 1440。
- **`S2-T1` 三态（通过，附一条 UX 事实）**：加载态有骨架屏并带 `aria-busy`；错误态给出「内容加载失败 / 无法连接到服务，请检查网络后重试」+「重新加载」按钮；空态（搜索无结果）给「没有找到相关帖子」+ 引导文案；详情页 404 给「帖子不存在」+「返回首页」。**值得记一笔的是错误态并非立即出现**：请求失败后要等重试退避耗尽（约 4 秒）才换成错误文案，这期间用户看到的是骨架屏。这是有意的重试策略带来的观感，不是缺陷，但「首屏失败」的体感由它决定，写在这里免得日后被当成 bug 反复排查。
- **`S2-T4` 图片（通过）**：详情页图片 `loading="lazy"`、`decoding="async"`、带 `width="2048" height="1365"`（尺寸预留，避免加载时抖动）、`alt` 为「标题 配图」；四档视口均无横向溢出，图片按容器宽度缩放（390 → 306px，768 及以上 → 620px），比例保持 3:2。
- **断点与溢出（`AC-13` 取证）**：6 个公开页（首页 / 发现 / 帖子详情 / 登录 / 话题 / 关于）× 4 档视口 = 24 次测量，`scrollWidth - innerWidth` 全部为 0；治理后台 7 个页面（1280 宽）同为 0。控制台无脚本异常，仅有匿名访问时 `/api/auth/me` 等端点返回 401 的资源日志（预期行为，浏览器会把它记成 error，不是缺陷）。
- **`S2-T5` 无障碍（未通过）**：用 axe-core（`wcag2a` + `wcag2aa` + best-practice）扫 6 个页面：
  - **对比度不达标（serious，每页 18–28 处）**：次要文字色 `#8a8c97`（令牌 `--sp-text-subtle`）在白底实测 **3.31–3.34**，AA 要求 4.5。命中对象包括时间戳、话题篇数、表单提示、页脚小字——都是小号正文，不属于「大字豁免」。
  - **`aria-valid-attr-value`（critical，首页）**：信息流 Tab 的 `aria-controls` 指向 `radix-…-content-recommended` 这类**根本不存在**的 id（内容由页面自己渲染，没有对应 `TabsContent`）。
  - **`aria-required-children`（critical，搜索页）**：`role="feed"` 容器里放了空态卡片，而该角色要求子元素是 `article`。同类结构在首页、话题页、收藏、点赞页都存在，只是空态未触发时不会报。
- **通过项（不能因为整体未通过就略过）**：登录页 3 个输入框均有 `<label>`、无未标注控件、`h1` 唯一、Tab 顺序为「品牌链接 → 导航 → 收藏…」，无跳过主内容的陷阱；后台页面均有可见 `h1`。
- **处置建议（等作者拍板，本轮不改代码）**：① 令牌 `--sp-text-subtle` 由 `#8a8c97` 调深到 `#6b6d78`——白底 5.14、浅灰底（`#f2f1ee`）4.72，均过 4.5，色相不变、观感差异很小，但**这会改变全站次要文字的明度，属设计变更**；② Tab 改为显式 `aria-controls` 指向信息流区域 id；③ `role="feed"` 只在有内容时挂载，空态/错误态移出该容器。三项都是小改动，但改完要把本记录重跑一遍并把 `S2-T5` 改为通过，所以不拆成半截提交。
- **真实局限**：① axe 只能查规则化的问题，测不出「读屏顺序是否讲得通」「焦点是否被遮罩吞掉」这类需要人判断的事，也没有实测真实读屏软件；② 对比度只覆盖纯色背景，渐变与图片上的文字不在自动判定内；③ 断点检查只验横向溢出与图片缩放，**没有做像素级视觉回归**，`AC-14`（视觉一致）仍只能由 lint 的「禁止硬编码颜色」规则 + 抽样截图支撑，不能算完成；④ 本轮数据是本地播种，与线上真实内容量级不同。

##### `VR-M7-07` · 第七批（部署文档核对、清理任务与演示内容）验证记录

- **目标**：`S3-T1…T8` 逐项核对文档与代码 / 配置的一致性（不重写）；补 `S2-T7` 清理任务结论；为 `AC-17`（演示内容标注、空态不被掩盖）取证。
- **方法**：逐条拿文档陈述去代码里找对应实现——找到则标一致，找不到或不符则改文档至实际。**没有为了"文档好看"去补实现**，也没有把核对写成"已完成"来充数。

**核对结果：发现并修正 6 处文档漂移**

| # | 位置 | 文档原述 | 实际 | 处置 |
| --- | --- | --- | --- | --- |
| 1 | `DEPLOYMENT §4.1` | 启动校验含"产物目录可读" | `validateEnv()` 查必填、枚举、正整数、大小关系、连接串格式，**不查目录** | 删该条，补说明：`PUBLIC_DIR` 只做解析，缺失在请求静态资源时暴露 |
| 2 | `DEPLOYMENT §8` 启动顺序 | 第 6 步"启动清理任务（含孤儿文件）" | 清理随限流事件触发，非启动时任务；无孤儿文件 | 改为监听即结束，并说明清理的真实触发方式 |
| 3 | `DEPLOYMENT §12` | 清理表含"孤儿图片文件"与"已软删除内容保留策略" | `pruneExpiredData()` 只清 `security_events`（按保留期）与 `sessions`（按过期） | 表只留两项；另起一段说明两项不适用及其原因 |
| 4 | `README` 功能概览 / 安装步骤 | 迁移 `001`–`019` | 目录实际到 `023` | 改为"当前至 `023`"，不写死区间 |
| 5 | `ARCHITECTURE §11` | "孤儿文件的定期清理" | 同 #3 | 改为"图片与元数据同事务，不产生孤儿，无对应清理任务" |
| 6 | `ARCHITECTURE §13` | 质量工具为"ESLint / Prettier" | 二者均未安装；实际为 `tsc --strict` + 自研零依赖脚本 `lint.mjs` / `check-file-size.mjs` / `scan-secrets.mjs` | 改为实际工具链，并注明未使用 ESLint / Prettier |

- **两处"看着像漂移、核对后是对的"，保留了原文**：① `README`「十个内置话题（含闲聊）」——`003` 播种九个，`007_chat_topic.sql` 再加「闲聊」（`sort_order=0`），合计十个，核对过程中一度误改为九个，查明后回滚；② `ARCHITECTURE §13` 的 `sharp`——它确实在 `server/package.json` 且被 `image-pipeline.ts` 直接 import，与"Serverless 避开原生编译的密码哈希"是两回事（密码哈希走 `hash-wasm`，图像处理走 `sharp`）。**这条记下来是因为差点把对的改成错的**：数字和依赖必须查到源头再动。
- **`S2-T7` 清理任务结论**：`pruneExpiredData()`（`auth.repository.ts`）由 `rate-limit.ts` 在 `recordEvent()` 时调用，清 `security_events`（超 `SECURITY_EVENT_RETENTION_DAYS`，默认 30 天）与 `sessions`（`expires_at` 已过）。**孤儿文件清理不适用**——图片字节存 `image_blobs`，与 `post_images` 元数据同事务提交（架构 §7.3），不产生孤儿。无独立定时循环，低流量实例的过期数据会滞留到下次限流事件才清，此为设计取舍，已在 `DEPLOYMENT §12` 写明。
- **`S3-T5` 待配置清单**：10 项均有对应章节，无隐含依赖；邀请码一项关联 §4（该节说明"一人一码由后台生成、不再用环境变量"），指向略泛但不构成错误。
- **`S3-T7` 变更记录**：根 / `web` / `server` 三处 `package.json` 与 `server/config/constants.ts` 的 `APP_VERSION` 均为 `1.5.0`；`CHANGELOG` 最新已发布条目 `[1.5.0]`，`[Unreleased]` 只收未发版改动。一致。
- **`S3-T8` / `AC-17` 演示内容（通过，附一条边界）**：`scripts/seed.mjs` 只创建示例账号 `starpal_demo`（显示名带「（示例）」后缀），**不插入任何示例帖子**——内容域分支只打印提示、不写库。因此信息流返回的是服务端真实空结果，空态是真空态，不被演示内容掩盖。**边界（记为待办，非当前失败）**：`posts.is_demo` 列存在，但 `post.projection.ts` 的 `VISIBLE` 条件未过滤该列；将来若播种 `is_demo=true` 的帖子，会与真实帖同列显示且前端无"示例"标注。当前无此类数据，故 `AC-17` 判通过，但该潜在风险须在启用演示帖播种前处理。
- **仍未覆盖**：`S3-T2`「按文档在空环境可复现」与 `S4-T4` 重叠，本轮只做文档一致性核对，**未在全新空环境从零复现**；该取证留到 `S4`。

##### `VR-M7-06` · 第六批（无障碍三项缺陷修复与复验）验证记录

- **目标**：把 `VR-M7-05` 查出的三类缺陷全部修复，并把「修好了」变成可回归的断言，而非只改一次截图。作者在本轮明确授权按业内专业标准修复。
- **三项修复**：
  - **对比度**：`--sp-text-subtle` 浅色 `#8a8c97` → `#6b6d78`（最不利浅背景 `#f2f1ee` 上 4.55，白底 5.14）、深色 `#7b8298` → `#949bb0`（最亮深色表面 `#222838` 上 5.30，比 `--sp-text-muted` 略暗以保留文字层级）。深色令牌是主动修的：旧 axe 只扫浅色，而 `#7b8298` 在深色 raised 表面只有 3.84，属同类隐患。改动只在 `styles/tokens.css`（lint 允许的硬编码位置），色相不变。
  - **`aria-valid-attr-value`（首页 Tab）**：信息流三个排序项原先借 Radix Tabs 的 `Trigger` 做样式，但没有对应 `Content`，`aria-controls` 指向不存在的 id。改为 `role="group"` + `aria-pressed` 按钮组——三项改变的是**同一信息流的查询条件**而非切换面板，按钮组才是相符的语义；键盘走按钮原生的 Tab / Enter / Space，不另造交互模型。未为此引入 ToggleGroup 依赖。
  - **`aria-required-children`（五页 feed）**：把 `role="feed"` 的挂载条件抽成纯函数 `feedRole(isPending, isError, itemCount)`，仅在有 `article`（即非加载、非错误、有条目）时给出 `feed` 角色；首页 / 话题 / 搜索 / 收藏 / 点赞五页统一调用。
- **回归用例**：新增 `tests/features/feed/FeedTabs.test.tsx`（3 项：选中态唯一、点击回调、不再产生 `role=tab` 与 `aria-controls`）与 `tests/lib/feed-a11y.test.ts`（3 项：三态不给角色、有条目给角色）。两者覆盖率均 100%。前端测试 81 → **87** 项。
- **复验（真浏览器 + axe-core）**：浅色 / 深色 × 首页 / 搜索空态 / 登录 = 六个组合全部 **0 违规**（`wcag2a` + `wcag2aa`），令牌计算值与预期一致。
- **一次假阳性的识别与排除（调试三步法）**：首轮复验用同一个 page 反复切主题、连续注入 axe，报出深色 194 处对比度违规。按三步法定位：① 如实记录命令与输出；② 判断根因是**脚本竞态**——DOM 已切到深色但样式仍在切换中间态，axe 读到不一致状态（我改的令牌是变亮，不可能让对比度变差，这个方向性矛盾是线索）；③ 改用「每页全新 context + 等一帧 + localStorage 同步主题」的受控脚本重跑，六个组合全部 0。若不做这一步，会把假数据写进验证记录。**结论**：深色主题无对比度违规；首轮 194 处为测量方法缺陷，不是产品缺陷。
- **`VR-M7-05` 的处置建议对照**：① 令牌改深——执行，且扩展到深色主题；② Tab 改 aria-controls 指向 feed——**改为按钮组**（理由见上，比原建议更符合语义）；③ feed 角色按内容挂载——执行。三项均已完成并复验，`S2-T5` 由「未通过」翻转为「通过」。
- **仍未覆盖（延续 `VR-M7-05` 的真实局限）**：未实测读屏软件；对比度不含渐变与图片上的文字；无像素级视觉回归，`AC-14` 仍不能算完成；深色主题本次只扫了与浅色相同的三个代表性页面，未做全站六页。

##### `VR-M7-08` · 第八批（S4 全量验收汇总）验证记录

- **目标**：把 `AC-01`—`AC-18` 逐条对照已有证据给出结论（只允许「通过 / 未通过 / 未验证」），补两件此前未做的取证——`S4-T2` 视觉一致、`S4-T4` 干净环境复现，并核对交付物清单（`S4-T5`）。**不重跑历史里程碑的验证，也不修改既有验证结论**（`VR-M7-08` 只做汇总与本轮新增取证）。
- **方法**：`AC` 证据取自各里程碑验证记录（VR-M2/M3/M4/M5/M6/M7），本轮只补缺口；`S4-T4` 在全新空库 `starpal_s4` 上从零实跑；`S4-T2` 用无头 Chromium 逐页读令牌计算值。

**S4-T4 干净环境复现（通过，全程无人工修补）**

| 步骤 | 真实命令 | 实测结果 |
| --- | --- | --- |
| 建空库 | `dropdb --if-exists starpal_s4 && createdb -O starpal starpal_s4` | 空库就绪 |
| 迁移 | `DATABASE_URL=…/starpal_s4 npm run migrate` | 应用 `001`–`023` 共 23 个，`schema_migrations=23` |
| 迁移幂等 | 再跑一次 `npm run migrate` | 「无待应用迁移」，仍为 23（DoD-03 达成） |
| 播种 | `npm run seed` | 仅建示例账号，不插帖子（与 `AC-17` 一致） |
| 管理员 | `ADMIN_USERNAME=s4admin … node scripts/init-admin.mjs` | 创建 1 名 admin，凭据未打印未入仓 |
| 构建 | `npm run build` | 退出码 0，前后端编译通过，23 迁移复制到 `dist/db/migrations` |
| 启动 | `DATABASE_URL=… PORT=3100 NODE_ENV=production npm run start` | 2 秒就绪，日志 `nodeEnv=production` |
| 健康检查 | `GET /api/health` | `{"status":"ok","database":"up","version":"1.5.0"}` |
| 静态资源 | `GET /` | 200，1370 bytes |
| API 冒烟 | `GET /api/topics` | 200，10 个话题 |

**S4-T2 视觉一致性（通过）**：无头 Chromium 逐页读计算样式，6 个公开页（首页 / 话题目录 / 关于 / 登录 / 注册 / 隐私）× 7 项令牌（bg `#faf9f7`、fg `#191a20`、subtle `#6b6d78`、accent `#5b57d6`、radius `12px`、glass-bg `#ffffffd9`、glass-blur `12px`）——**每项跨页唯一值数均为 1**，即无页面级样式分叉。每页 `sp-glass` 元素数一致（2 处：底栏 + 顶栏/菜单），页面级内联硬编码颜色 0 处，脚本错误 0 条，`h1` 各 1 个。结合 lint R1/R2 对组件与令牌导入的约束，构成 `AC-14` 的可复核证据。
- **一处证据边界（如实记录）**：lint 的 `walk()` 只收 `.ts/.tsx/.js/.jsx`，**不扫 `.css`**。`globals.css:112` 的 `.sp-overlay` 蒙层色 `rgba(12,14,22,0.42)` 从未被 R2 检查。查证后该色为有意设计（`ImageLightbox` 注释说明它与 `--sp-scrim` 的分工，且观感符合 NFR-VIS），**不是当下缺陷**；但 R2 原注释「web/src 下不得硬编码颜色」的宣称范围大于实际扫描范围。本轮已把注释改为如实描述（只扫代码文件），**未扩大 lint 扫描范围**——那会改变质量门禁行为（🟡 先问类），且需连带处理该 CSS 色值，留作后续单独决策。

**AC-01—18 汇总结论**

| AC | 结论 | 证据出处与本轮补证 |
| --- | --- | --- |
| `AC-01` 注册真实记录 | 通过 | `VR-M2-03`（生产库新行 + `$argon2id$` 哈希） |
| `AC-02` 登录登出 | 通过 | `VR-M2-05`（登出后受保护接口 401） |
| `AC-03` 密码哈希 | 通过 | `VR-M2-04` + `VR-M2-12`（库与日志无明文） |
| `AC-04` 创建帖子 | 通过 | `VR-M3-10`（界面发帖 → 详情可见） |
| `AC-05` 刷新持久化 | 通过 | `VR-M3-10` / `M3-S5-T2`（重新加载内容不变） |
| `AC-06` 图片校验 | 通过 | `VR-M3-15`（伪造类型 415 / 超限 413 / EXIF 净化）+ `M7` 上传安全用例 |
| `AC-07` 点赞不可重复 | 通过 | `VR-M4-01`（唯一约束 + 并发幂等）、`VR-M4-04`（刷新计数） |
| `AC-08` 评论展示 | 通过 | `VR-M4`（时间序 + 删除同步） |
| `AC-09` 话题筛选 | 通过 | `VR-M3-09` / `M3-S4-T1`（结果仅含目标话题） |
| `AC-10` 资料编辑 | 通过 | `VR-M2-15`（修改生效、越权被拒） |
| `AC-11` 管理端点隔离 | 通过 | `VR-M6` + `VR-M7-01`（18 端点 × 三身份，变异实验验证非空转） |
| `AC-12` 处置与留痕 | 通过 | `VR-M6`（处置产生 `moderation_logs`） |
| `AC-13` 移动端布局 | 通过 | `VR-M3-18` + `VR-M7-05`（24 次测量 + 四档视口，零横向溢出） |
| `AC-14` 视觉一致 | 通过 | `VR-M7-08` 本轮（6 页 × 7 令牌唯一值数均 1）+ lint R1/R2 |
| `AC-15` 三态完备 | 通过 | `VR-M7-05`（加载/错误/空三态齐备） |
| `AC-16` 数据导出 | 通过 | `VR-M5-S4-01`（真库+真实会话端到端，`export:check` 通过） |
| `AC-17` 演示内容标注 | 通过（附边界） | `VR-M7-07`（种子不插演示帖，空态真空；`is_demo` 未过滤列为待办） |
| `AC-18` 仓库无凭据 | 通过 | `VR-M2-12` + `VR-M7-01`（547 文件 / 87 提交全历史 0 命中） |

- **结论口径**：18 项中 17 项「通过」，`AC-17` 为「通过（附边界）」——边界是潜在风险而非当前失败，已在 `VR-M7-07` 记为待办。**无「未通过」、无「未验证」项**。
- **DoD-01—10 复核**：`DoD-01/02/04/06/08/09` 由 `VR-M7-01/02` 与前述 AC 证据支撑；`DoD-03`（迁移空库执行且幂等）与 `DoD-02`（生产启动 + 健康检查）由本轮 `S4-T4` 直接取证；`DoD-05`（三态 + 服务端权限）见 `VR-M7-05` 与 `AC-11`；`DoD-07`（README/CHANGELOG 同步 + 状态更新）随本批交付；`DoD-10`（未引入非目标能力）经 `VR-M7-07` 文档核对无新增能力。**全部满足**。
- **仍未覆盖（不写成已完成）**：① 未实测真实读屏软件、未做像素级视觉回归（`AC-14` 的自动取证只覆盖规则化项目）；② `AC-16` 导出无总量上限与压测数据、`AC-06` 线上 CDN 缓存旧图问题见 `VR-M3-17`（已改 `max-age=3600` 复验）；③ 线上（Vercel）真实账号 E2E 完整交互回归仍未做——`S1-T3` 端到端方案（A/B/C）仍待作者拍板；④ 本轮 `S4-T4` 为本地空库复现，非 Vercel 环境。上述均不影响里程碑完成判据（判据要求「有验证记录且通过」，未要求线上 E2E），但如实列出以免被误读为「线上全链路已验」。

**M7 交付物**：自动化测试、加固成果、部署与配置文档、README / CHANGELOG、全量验证记录、交付物清单。

**M7 完成判据**：`AC-01`—`AC-18` 全部有验证记录且结论为「通过」（未执行项须显式标注并保持里程碑为未完成）；`DoD-01`—`DoD-10` 全部满足；干净环境可按文档完整启动。

**风险与回退**：验收阶段发现的问题优先在对应里程碑内修复并重新执行该里程碑及之后的验证记录；严禁直接修改验证结论。

---

## 5. 验证与验收执行

### 5.1 验收项与里程碑映射

| 验收项 | 主验里程碑 | 验证方式要点 |
| --- | --- | --- |
| `AC-01` 注册产生真实记录 | `M2` | 注册后查询用户表，密码字段为哈希 |
| `AC-02` 登录登出 | `M2` | 登出后受保护接口返回未授权 |
| `AC-03` 密码哈希 | `M2` | 数据库与日志无明文凭据 |
| `AC-04` 创建帖子 | `M3` | 提交后信息流与详情可见 |
| `AC-05` 刷新持久化 | `M3` | 重新加载内容不变 |
| `AC-06` 图片校验 | `M3` / `M7` | 伪造类型 / 超限 / EXIF 样例 |
| `AC-07` 点赞不可重复 | `M4` | 唯一约束 + 并发请求 + 刷新计数 |
| `AC-08` 评论展示 | `M4` | 时间序、删除同步 |
| `AC-09` 话题筛选 | `M3` | 结果仅含目标话题 |
| `AC-10` 资料编辑 | `M2` | 修改生效、越权被拒 |
| `AC-11` 管理端点隔离 | `M6` / `M7` | 三类身份逐一请求 |
| `AC-12` 处置与留痕 | `M6` | 处置生效且产生日志 |
| `AC-13` 移动端布局 | `M1` / `M7` | 四断点、触摸目标、无横向溢出 |
| `AC-14` 视觉一致 | `M1` / `M7` | 全站页面逐一检查 |
| `AC-15` 三态完备 | `M7` | 加载 / 错误 / 空逐一复现 |
| `AC-16` 数据导出 | `M5` | 导出文件外部可读且边界正确 |
| `AC-17` 演示内容标注 | `M3` / `M7` | 标记与空态检查 |
| `AC-18` 仓库无凭据 | `M2` / `M7` | 全仓库扫描 |

### 5.2 干净环境验证流程

```text
1. 准备空数据库
2. 配置环境变量（.env.example 中的必填项）
3. npm install（按各包）
4. npm run migrate
5. npm run seed（可选，仅演示环境）
6. npm run init:admin
7. npm run build
8. npm run start
9. GET /api/health
10. npm run verify（typecheck + build + size + lint + scan:secrets + test:coverage）
11. 浏览器三态 / 断点 / 无障碍巡检为人工取证，见 VR-M7-05 / VR-M7-06（本项目无 test:e2e 脚本）
12. 按 §5.1 逐条记录验证结果
```

> 本流程已在空库 `starpal_s4` 上自 `migrate` 至 `health` 实跑一遍、全程无人工修补，见 `VR-M7-08`。

### 5.3 回归触发条件

| 触发 | 回归范围 |
| --- | --- |
| 迁移变更 | 全部依赖该表的模块 + 干净环境初始化 |
| 认证 / 会话变更 | 全部受保护端点 + 权限矩阵 |
| 上传管线变更 | 上传安全用例 + 图片渲染与清理 |
| 令牌或组件变更 | 组件预览页 + 全站视觉一致性 |
| 端点契约变更 | 前端调用点 + 集成测试 + API 文档 |
| 排序策略变更 | 信息流三 Tab + 分页去重 |

---

## 6. 风险登记

| 编号 | 风险 | 影响 | 触发信号 | 对策 |
| --- | --- | --- | --- | --- |
| `IR-01` | 视觉基线未确认即铺开 | 大规模返工 | `M1-S3-T8` 未完成 | 组件预览页作为硬性前置 |
| `IR-02` | 会话 / 权限基座不稳 | 后续模块全量返工 | `M2` 验证记录缺失 | 冻结后再进入 `M3` |
| `IR-03` | 计数与明细不一致 | 数据可信度下降 | 出现绕过服务层的写入 | 事务维护 + 重算脚本 + 回归 |
| `IR-04` | 上传校验被绕过 | 安全风险 | 伪造类型用例失败 | 三层校验 + 重编码 + 目录权限 |
| `IR-05` | 游标分页重复 / 跳项 | 阅读体验下降 | 快速翻页出现重复 | 单键游标 + 按 ID 去重 + 单一在途请求 |
| `IR-06` | 模块边界被打破 | 改动级联扩散 | lint 导入边界报错被忽略 | 构建前拦截，变更走 ADR |
| `IR-07` | 范围蔓延导致无法收口 | 交付延期 | 出现非目标清单中的能力 | 冻结清单 + 变更控制 + §3.7 审批 |
| `IR-08` | 演示内容掩盖真实空态 | 验收失真 | 空态无法复现 | 种子可选执行 + 空态独立验证 |
| `IR-09` | 文件与数据库引用不一致 | 图片丢失或孤儿文件 | 引用数与文件数不符 | 事务清理 + 备份一致性校验 |
| `IR-10` | 验证记录缺失或推定结论 | 无法判定完成 | 记录表出现空白 | DoD 强制 + 结论取值受限 |

---

## 7. 交付物清单

| 类别 | 内容 | 来源里程碑 |
| --- | --- | --- |
| 完整源码 | `web/` 前端、`server/` 后端、`scripts/` 脚本 | `M1`—`M6` |
| 数据库 schema 与迁移 | `migrations/` 顺序编号，以目录实际占用为准（当前 `001`–`023`，共 23 个）、`seeds/`、`schema_migrations` | `M1`—`M6` |
| 环境变量文档 | 变量表、示例占位、安全说明 | `M7` |
| 启动说明 | 开发 / 构建 / 单进程启动 | `M7` |
| PostgreSQL 配置说明 | 实例准备、迁移、备份与恢复 | `M7` |
| 已实现功能清单 | 对照 PRD §9.1 逐项状态 | `M7` |
| 待配置功能清单 | 见 §8 | `M7` |
| 已知限制与未完成项 | 见 §9 | `M7` |
| 验证记录 | `AC-01…18` 与各里程碑检查记录 | 全程 |
| 项目文档 | `README.md`、`CHANGELOG.md`、`docs/` 四份 | 全程 |

---

## 8. 待配置清单（由部署方完成）

| 项 | 说明 | 关联文档 |
| --- | --- | --- |
| 运行环境变量值 | 数据库连接串、会话密钥、邀请码、上传目录与上限、端口、环境标识 | `DEPLOYMENT.md` |
| 初始管理员凭据 | 由一次性脚本结合环境变量创建 | `DEPLOYMENT.md` |
| 邀请码分发 | 由部署方自行分发，不写入仓库 | `DEPLOYMENT.md` |
| 图片存储 | 二进制存 `image_blobs`，无需持久卷与上传目录 | `DEPLOYMENT.md` §6 |
| 反向代理与 TLS | 终止 TLS、转发至应用端口、静态资源策略 | `DEPLOYMENT.md` |
| 备份计划与保留期 | 数据库逻辑备份 + 文件目录备份，同一时间点 | `DEPLOYMENT.md` |
| 社区准则与隐私说明最终文案 | 由维护者在发布前审定 | `PRD.md §4.12 / §3.3` |
| 可选人机验证 | 默认关闭，需要时按扩展点接入自托管实现 | `ARCHITECTURE.md §10.1` |
| 监控接入 | 健康检查端点可对接外部监控，不作为运行依赖 | `DEPLOYMENT.md` |

---

## 9. 已知限制与未完成项

| 项 | 说明 |
| --- | --- |
| 单实例部署 | 不具备水平扩展能力；会话与限流已持久化，便于后续拆分 |
| 私信即时性 | v1.0 为留言式，需刷新获取新消息 |
| 排序能力 | 确定性加权，无自适应与个性化 |
| 评论结构 | 单层，不含嵌套回复 |
| 检索能力 | 数据库条件检索，未接入独立检索引擎 |
| 统计能力 | 基础数值指标，无时序分析 |
| 防刷边界 | 无联系方式的注册体系无法彻底阻断自动化注册，目标为提高自动化成本 |
| 文件存储 | 图片占数据库免费额度；总量超 500 MB 需迁移对象存储 |
| 部署 | 公开部署与域名绑定不在本计划内，须单独决策 |

---

## 10. 收尾检查表

| 检查项 | 判定 | 记录编号 |
| --- | --- | --- |
| 全部 `FR-*` / `NFR-*` 有对应实现 | 待检查 | — |
| `AC-01…18` 均有真实验证记录 | 待检查 | — |
| `DoD-01…10` 在七个里程碑均满足 | 待检查 | — |
| 冻结清单未漂移（18 表 / 16 模块 / 端点清单） | 待检查 | — |
| 非目标清单中的能力未被引入 | 待检查 | — |
| 干净环境可按文档完整启动 | 待检查 | — |
| `README` / `CHANGELOG` 与代码同步 | 待检查 | — |
| 仓库无真实凭据 | 待检查 | — |
| 待配置与已知限制已如实列出 | 待检查 | — |

> 全部检查项通过后方可标记 v1.0 为完成；任一项未通过或未验证，须在交付说明中明确列出。
