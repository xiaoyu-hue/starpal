# 星聚 STARPAL

> 让兴趣相遇，让热爱聚集。
> Where Interests Meet, Communities Grow.

![版本](https://img.shields.io/badge/version-1.5.0-2563eb)
![源代码许可](https://img.shields.io/badge/code-AGPL--3.0--or--later-blue)
![文档许可](https://img.shields.io/badge/docs-CC%20BY--NC--SA%204.0-orange)
![Node.js](https://img.shields.io/badge/node-%3E%3D22.12%20%3C23-339933)

| 项目 | 内容 |
| --- | --- |
| 中文名 | 星聚 |
| 英文名 | STARPAL |
| 品牌标记 | SP |
| 当前版本 | **v1.5.0**（2026-11-16 发布） |
| 状态 | 已上线 · 邀请制运营中 |
| 形态 | 响应式 Web 应用（桌面 / 平板 / 移动端浏览器），非 App |
| 当前访问地址 | `starpal.cc.cd` |
| 源代码许可 | AGPL-3.0-or-later |
| 文档许可 | CC BY-NC-SA 4.0 |

**星聚 STARPAL 是一个以话题组织的、邀请制的小型兴趣社区。** 成员凭运营者颁发的邀请码注册，围绕话题发帖、配图、评论、点赞与收藏，并在明确的社区准则下共处。它不是模板、不是演示项目、也不是商业服务；社区里是真实存在的人，因此任何改动都以「不打扰、不误导、可回溯」为前提。

**先把三个名字分清楚**（此前协议文档曾把域名当成品牌，已更正）：

- **星聚（STARPAL）** 是品牌与服务名；
- **运营者** 是维护这项服务的个人；
- **`starpal.cc.cd`** 只是当前访问地址，不是品牌标识，也不是运营主体。日后更换域名，协议与说明继续适用于同一项服务。

> 本项目**不是**平台、不是商业服务、不是公共服务、不是长期可用性承诺，也不是原生 App；它是非经营性、小规模、由个人维护的兴趣社区。完整边界见站内「产品声明」与「免责声明」页（文案源文件：[`product.doc.ts`](./server/src/config/docs/product.doc.ts)、[`disclaimer.doc.ts`](./server/src/config/docs/disclaimer.doc.ts)）。

---

## 目录

- [功能概览](#功能概览)
- [当前状态与路线图](#当前状态与路线图)
- [给使用者](#给使用者)
- [给开发者](#给开发者)
  - [技术栈](#技术栈)
  - [环境要求](#环境要求)
  - [快速开始](#快速开始)
  - [环境变量](#环境变量)
  - [脚本契约](#脚本契约)
  - [项目结构](#项目结构)
  - [API 概览](#api-概览)
  - [质量门与测试](#质量门与测试)
  - [部署](#部署)
- [安全与隐私](#安全与隐私)
- [文档索引](#文档索引)
- [版本与发布](#版本与发布)
- [许可与第三方](#许可与第三方)
- [致谢与依赖](#致谢与依赖)
- [贡献](#贡献)
- [反馈与联系](#反馈与联系)

---

## 功能概览

以下每一项都对应仓库中的真实实现；**尚未完成的能力不列在这里**，见[当前状态与路线图](#当前状态与路线图)。

**内容与发现**

- 三种信息流（`latest` 最新 / `popular` 热门 / `recommended` 推荐），确定性排序 + 键集游标分页，无重复无遗漏。
- 帖子创建、编辑、删除（作者或管理员）、详情页、相关帖子；正文与图片混排。
- 图片上传：服务端按**魔术字节**校验真实类型（JPEG / PNG / WebP / AVIF，拒绝 SVG 等可执行内容），统一重编码为 WebP 并剥离 EXIF / GPS 元数据；二进制存于 PostgreSQL，不落本地磁盘。
- 图片大图查看：灯箱原比例展示，支持鼠标、键盘（`←` `→` `Esc`）与触摸滑动，多图循环切换。
- 十个内置话题（含「闲聊」）、话题目录页、话题详情与按话题筛选。
- **全站搜索**：顶栏放大镜进入 `/search`，按帖子标题 / 正文 / 话题名检索；结果与信息流同一可见性口径（草稿、已删除、停用作者的内容不出现），键入分页加载，空关键词与无结果都有明确提示。
- **站内私信（留言式）**：他人主页「发私信」或私信页输入用户名发起，两人之间恒一个会话（`LEAST/GREATEST` 归一化 + 唯一约束）；会话列表带最近消息预览与对方头衔徽章，消息按时间倒序分页。整组 `requireAuth`，服务层二次校验参与者，非参与者 `FORBIDDEN`。边界：无实时推送、无未读红点，对方刷新或下次打开可见。

**互动与通知**

- 点赞 / 收藏：幂等开关端点（`PUT` 建立、`DELETE` 撤销），计数与明细在同一事务内更新；乐观更新失败回滚、以服务端返回计数校正。**写入口都在帖子详情页**：信息流卡片只显示点赞数、不做点赞按钮（点赞会改变热门排序，卡片点赞会让正在滚动的列表跳序），收藏按钮则与详情页共用同一份逻辑。
- **我的收藏 / 我的点赞**：登录后分别在 `/bookmarks`、`/likes` 查看自己收藏 / 点过赞的帖子，按收藏 / 点赞时间倒序、键集游标分页；入口在侧栏 / 移动抽屉与「设置」。列表只返回当前登录者且仍可见的帖子（帖子被删除、话题归档、作者停用后不再出现），未登录由路由守卫拦截、接口亦由服务端 `requireAuth` 校验。点赞影响热门排序，写入后信息流与点赞列表一并失效重取；收藏不改变排序，只就地更新列表项。
- 评论：单层结构，时间倒序游标列表，正文上限 2000 **Unicode 码点**（emoji 算 1），作者或管理员可删除；匿名可读、登录才可发表。
- 通知中心：评论触发给帖子作者的通知（自己评论自己不产生通知），顶栏铃铛红点角标（>99 记 `99+`）、未读数、列表未读高亮与「全部标为已读」。
- **等级与段位**：个人页显示等级牌——`L1`–`L50` 连续刻度，五段位（萌新 / 入门 / 常客 / 老友 / 元老）。经验由发帖、评论、收到的赞、覆盖话题、邀请与加入天数加权**现算**（私信不计分；话题最多算 5 个、天数最多 100 天），不建经验流水表。等级**只升不降**：删帖、撤赞会让经验下降，但等级取历史最高。刻意不展示升级进度、不做等级排行、帖子与评论署名行不显示等级。与「头衔」（社区长 / 创始人 / 管理员，站长身份）是两套东西，界面上配色也分开。

**账户与安全**

- **邀请制注册**：一人一码、用完即失效、可撤销。邀请码以 HMAC-SHA256 哈希存储，明文仅在生成时返回一次；注册在**同一事务内原子消费**，无效码整笔回滚，杜绝「码废号建成」。管理员在设置页「运营管理」中生成 / 查看 / 撤销。
- 注册 / 登录 / 登出、服务端会话（Cookie `HttpOnly` + `SameSite=Lax` + 生产环境 `Secure`）、受保护路由。
- **自助改密**：登录后凭当前密码设置新密码；同事务撤销该用户其它设备的会话，当前设备不掉线；改密失败独立限流。
- 账号注销与**彻底擦除本人数据**；公开个人页、资料编辑、浅色 / 深色主题切换。
- **数据导出**：设置页「导出我的数据」可把本人全部帖子（含草稿与已删除，标注状态）、评论、图片链接与资料字段下载为 Markdown 或 JSON。`GET /api/export?format=md|json`，整组 `requireAuth`，范围严格限定本人，不含私信与他人内容；产物是标准文件，可被外部工具直接读取，并由 `npm run export:check` 校验结构与隐私边界。**只有导出、没有导入**——整站恢复走数据库备份，不让用户把文件传回来重建一堆无互动的空壳。
- 口令用 **Argon2id**（经 `hash-wasm` 纯 WASM 实现，适配 Serverless，无原生编译依赖），参数随哈希串存储。
- 分层防刷：限流、蜜罐字段、登录失败限次、改密失败限次、安全事件留痕；注册勾选同意《用户协议》《隐私说明》《免责声明》并留痕。

**社区与信息**

- 结构化**社区公告**：类型标签（新增 / 修复 / 规则 / 状态 / 通知）、先摘要后明细、写明「对你的影响」；右栏卡片与独立公告页读同一份后端数据。**公告分三层**：发布记录（功能上线档案，随代码版本走、不可改）、当前状态（现在能用什么，置顶）、运营通知（维护与提醒）——后两层存在数据库里，运营者在「设置 → 运营管理 → 社区公告」可新建、编辑、存草稿、发布 / 撤回、置顶与删除，改一条公告不必发版。
- 六份说明页：用户协议、隐私说明、社区准则、免责声明、产品声明、关于。文案随代码版本化、不入库，页面展示的即当前代码行为。
- **举报与申诉 + 治理后台**：帖子详情与评论旁的「举报」、侧栏 /「设置」的「我的提交」、其中的「提交申诉」、以及管理员处理队列（按状态筛选，标记「已处理 / 已驳回」并写答复）。提交内容仅本人与运营者可见；用户侧整组 `requireAuth`，管理侧整组 `requireAuth + requireRole(ROLE_ADMIN)`，服务层另有二次复核；已处理的提交不可重复决策。配套的**治理后台**（设置 → 运营管理 → 治理后台）可停用 / 恢复账号、移除 / 恢复内容、创建 / 编辑 / 归档话题、查看四项统计，每次处置写入只追加审核日志；举报队列本身仍只标记状态与答复，不自动判定违规。

**工程质量**

- 统一设计令牌（含导航 / 浮层的玻璃质感）、浅深两套主题、响应式布局、加载 / 错误 / 空三态、语义化 HTML 与键盘可达。
- 前后端按业务域模块化、单向依赖、模块导入边界由 lint 硬规则守护；参数化查询 + 事务边界 + 服务端权限校验。
- 版本化数据库迁移（`001`–`019`，只增不改历史）、结构化日志、集中错误处理、统一响应包络。
- 唯一质量门 `npm run verify`、单文件行数预算、lint 硬规则、Node 内置测试框架 + PGlite 内存库。
- 零付费第三方依赖；全部源码文件带 `SPDX-License-Identifier` 头。

---

## 当前状态与路线图

以 [`docs/IMPLEMENTATION-PLAN.md`](./docs/IMPLEMENTATION-PLAN.md) 为准。里程碑与发布对应关系：

| 里程碑 | 内容 | 状态 | 发布 |
| --- | --- | --- | --- |
| `M1` | 项目骨架、设计系统、响应式外壳、三态 | ✅ 已交付 | `v1.0.0` |
| `M2` | 注册登录、会话安全、个人资料与设置 | ✅ 已交付 | `v1.0.0` |
| `M3` | 帖子、图片上传、话题、详情页、大图查看 | ✅ 已交付 | `v1.1.0` |
| `M4` | 点赞收藏评论、通知中心、一人一码、自助改密 | ✅ 已交付 | **`v1.2.0`** |
| `M5` | 私信、成就时间线、每周热门、搜索、导出 | ✅ 已交付：私信、成就与每周热门、搜索、数据导出（通知仅覆盖评论，范围收窄见 `PRD.md` §4.11） | **`v1.3.0`** |
| `M5.5` | 头衔与等级：站长授权头衔 / 经验 / `L1`–`L50` 等级 / 五段位 | ✅ 已交付：站长头衔（`M5.5-S1`）、经验与等级（`M5.5-S2`）；每日签到经评审取消（与 `FR-ACH-04` 冲突） | **`v1.4.0`** |
| `M6` | 管理后台、举报、审核、权限校验、审计日志 | ✅ 已交付：举报 / 申诉、社区公告、治理后台六分区（用户 / 内容 / 话题处置）、只追加审核日志、基础统计与权限回归（详见 `VR-M6-01` / `VR-M6-02`） | **`v1.5.0`** |
| `M7` | 测试与性能加固、部署文档、验收 | ⬜ 未开始 | — |

**当前对社区用户公示的未完成项**（与站内公告一致）：`M5` 四类能力（私信 / 成就与每周热门 / 搜索 / 导出）已交付；其中**通知只覆盖「评论」一种**——点赞、收藏、私信、公告都不单独提醒，这是已登记的范围收窄（见 `PRD.md` §4.11），不是待补的遗漏。`M5.5` 的经验与等级已于 2026-11-15 交付，原计划的**每日签到按 `FR-ACH-04` 取消**（该条明确「不得实现连续签到」，取消理由见 `CHANGELOG.md` 与 `IMPLEMENTATION-PLAN.md` 的 `M5.5-S3`），不再列为待补；`M6` 治理后台与审核日志已交付（`reviewing` 状态与「不当行为」举报的数据层已就绪，但服务层与界面未启用，仍列增强项），`M7` 的验收加固仍未开始。导航目的地现已全部有实际内容，不再有功能占位页（仅 404 页保留明确标注的占位样式），不提供点击无效果的伪交互控件。

`M6` 已交付完整治理闭环：内容旁的举报入口、「我的提交」、管理员处理队列（标记「已处理 / 已驳回」并写答复），以及运营者「设置 → 运营管理 → 治理后台」六分区——可停用 / 恢复账号、移除 / 恢复帖子评论、创建 / 编辑 / 归档话题、查看四项基础统计；每次处置都记入只追加审核日志，可恢复操作不物理删除数据。举报队列的复核本身仍只是标记状态与答复，不自动判定违规；`reviewing`（复核中）与「不当行为」举报暂未启用。

> 「已实现但无界面」不计入已完成；上述占位页即属此类。信息流、收藏列表、点赞列表等列表接口无真实内容时返回服务端真实空结果，不填充演示数据制造活跃假象。

`M4` 的功能与验证已全部完成：`6` 个子阶段 `24/24` 子任务、验证记录 `VR-M4-01`—`VR-M4-10` 全部通过（含真实 PostgreSQL 端到端与 390px 浏览器实机验证），`npm run verify` 全绿。**`v1.2.0` 即 `M4` 的收尾发布版本。** 测试数量、扫描文件数等一切数字均以 `npm run verify` 当次实际输出为准，不在文档中写死。

`M5` 同样已收尾：四个子阶段（私信、成就与每周热门、搜索、数据导出）各有验证记录，`DoD-01`—`DoD-10` 逐条核对通过，收尾记录见 `VR-M5-CLOSE`。收尾时确认**有一处需求按 1/5 交付并已登记偏差**——`FR-AUX-01` 要求五类通知，实际只实现「评论」一类，点赞 / 私信 / 公告 / 提及四类不做的理由逐条写在 `PRD.md` §4.11。这是**主动收窄并对外披露**，不是待补的遗漏：站内「当前进度与已知问题」公告已写明「通知只在你收到评论时发出」。**`v1.3.0` 即 `M5` 的收尾发布版本。**

---

## 给使用者

**怎么进来**：本站为邀请制，注册需要运营者亲自颁发的邀请码。请向邀请人索取；一个码只能注册一次，用完即失效，运营者可随时撤销。旧版统一通用码已下线。

**进来之后**：浏览信息流 → 挑话题 → 写正文 / 配图 → 发布 → 在详情页被点赞、收藏、评论；有人评论你的帖子会收到通知；在「设置」里可以改资料、换主题、改密码、查看「我的收藏」与「我的点赞」，也可以注销或彻底擦除自己的数据。发现问题的帖子或评论可以点「举报」，认为某项处理有误可在「我的提交」里提交申诉，状态与答复都回到那里看。

**想反馈 / 投诉 / 申诉**：举报具体帖子或评论，用内容旁的「举报」；认为某项处理有误，在「我的提交」点「提交申诉」。两条都会进入「我的提交」，处理状态与运营者答复都在那里看——本站没有邮箱，不会主动通知你。其它反馈与需求可站内私信社区长兼管理员 **@Solvyre**（从其主页点「发私信」，或在「私信」页输入用户名发起）——私信是留言式，对方刷新或下次打开时可见，不会有实时提醒；也可在任意**社区公告帖下留言**。为保护你的个人信息，请不要在公开场合贴身份证、住址、联系方式等材料。

**想了解规则**：页脚与抽屉菜单可到达社区公告、社区准则、隐私说明、用户协议、免责声明、产品声明、关于。注册时勾选同意的三份协议也可随时查阅。

---

## 给开发者

> 本节假设你在本地搭建一份**自己的**实例。生产环境配置见 [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)。

### 技术栈

| 层 | 技术 |
| --- | --- |
| 运行时 | Node.js `>=22.12 <23`（由 `.nvmrc` 与 `engines.node` 锁定）、npm workspaces |
| 前端 | React 19 + TypeScript、Vite、React Router、TanStack Query、Tailwind CSS、**Radix UI 原语 + 自研组件**、lucide-react |
| 后端 | Express 5、PostgreSQL（`pg`，全部参数化查询）、`hash-wasm`（Argon2id）、`sharp`（图片重编码）、`multer`（上传）、`dotenv` |
| 存储 | PostgreSQL：结构化数据与图片二进制同库（`ADR-014`），无对象存储、无本地文件目录 |
| 测试 | Node 内置 `node:test` + `tsx` + `@electric-sql/pglite`（WASM 内存库，不连真实库） |
| 部署 | Vercel Serverless Function（`api/index.ts`）+ Neon PostgreSQL；前端静态产物构建至 `server/public/` |

精确版本以各 `package.json` 与 `package-lock.json` 为准，不在文档中另写一份。项目**未引入** shadcn/ui、ALTCHA、全局状态库、ORM、Redis、消息队列、对象存储 SDK、外部验证码与 SSR 框架；防刷与组件均为自研。

### 环境要求

| 项 | 要求 |
| --- | --- |
| Node.js | `>=22.12 <23` |
| npm | 随 Node.js 提供（workspaces） |
| PostgreSQL | 一个可达实例，连接串经 `DATABASE_URL` 注入 |
| 文件系统 | 无需可写持久卷：图片二进制存于 PostgreSQL |
| 浏览器 | 现代桌面与移动浏览器 |

### 快速开始

```bash
# 1. 使用锁定的 Node 版本
nvm use

# 2. 安装依赖（根目录 npm workspaces 一次安装）
npm install

# 3. 配置环境变量：复制示例，填入本地值（.env 已被 gitignore 排除，切勿提交真实值）
cp .env.example .env

# 4. 执行全部数据库迁移（001–019，幂等、只增不改）
npm run migrate

# 5. 创建初始管理员（仅本地/首次部署执行一次）
#    不要把密码写在命令行里（会留在 shell 历史与进程列表）：
#    把 ADMIN_* 写进未被跟踪的 .env.local，再执行：
node --env-file=.env.local scripts/init-admin.mjs

# 6. 开发模式：并行启动后端 API（:3000）与前端开发服务器
npm run dev

# 7. 可选：写入明确标注「示例」的种子话题与帖子（仅开发期视觉验证）
npm run seed

# 8. 构建（前端产物 → server/public，后端编译 → server/dist）
npm run build

# 9. 单进程启动（本地验证用；生产由 Vercel Serverless 接管）
npm run start

# 10. 全量质量门（交付前必跑）
npm run verify
```

开发模式下前端通过代理访问 `/api`；健康检查 `GET /api/health`。快速查看视觉而不连后端：`node scripts/build-standalone.mjs` 生成 `web/dist/starpal-preview.html`。

> **注册需要邀请码**：初始管理员由脚本创建，不经过注册表单。之后请登录管理员账号，在「设置 → 运营管理 → 邀请码」生成邀请码；明文只显示一次，请妥善保存。

### 环境变量

完整键名与说明见 [`.env.example`](./.env.example)，校验逻辑见 [`server/src/config/env.ts`](./server/src/config/env.ts)。

| 变量 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | — | PostgreSQL 连接串，启动时校验前缀 |
| `SESSION_SECRET` | ✅ | — | 高熵随机值，用于会话与邀请码 HMAC |
| `NODE_ENV` | — | `development` | `development` / `test` / `production` |
| `PORT` | — | `3000` | 本地开发监听端口 |
| `SESSION_TTL_HOURS` | — | `168` | 会话有效期（小时） |
| `RATE_LIMIT_WINDOW_SECONDS` / `RATE_LIMIT_MAX` | — | `3600` / `20` | 限流窗口与上限 |
| `LOGIN_FAIL_MAX` | — | `5` | 登录 / 改密失败限次 |
| `SECURITY_EVENT_RETENTION_DAYS` | — | `30` | 安全事件保留天数 |
| `MAX_UPLOAD_BYTES` / `MAX_BODY_BYTES` | — | `3145728` / `4194304` | 单图 3 MB / 请求体 4 MB（Vercel 硬上限留余量） |
| `PUBLIC_DIR` | — | `./server/public` | 静态产物目录 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_DISPLAY_NAME` | — | — | 仅初始化脚本读取，不常驻配置 |

> 已下线的 `INVITE_CODE`（统一通用码）**不再使用**，请勿配置。邀请码改为数据库内逐码生成。

### 脚本契约

| 脚本 | 作用 |
| --- | --- |
| `npm run dev` | 并行启动前端开发服务器与后端 API |
| `npm run dev:web` / `dev:server` | 单独启动前端 / 后端 |
| `npm run build` | 前端构建 + 后端编译 |
| `npm run start` | 单进程托管静态资源与 API（本地） |
| `npm run migrate` / `migrate:prod` | 执行未应用迁移（后者跑编译产物，不依赖 `tsx`） |
| `npm run seed` | 写入示例话题与帖子（可选、明确标注「示例」） |
| `npm run init:admin` | 一次性创建初始管理员 |
| `npm run typecheck` / `lint` / `check:size` / `scan:secrets` | 类型检查 / lint 硬规则 / 单文件行数预算 / 明文凭据扫描 |
| `npm test` | 单元与集成测试（PGlite 内存库） |
| `npm run verify` | **唯一质量门**：typecheck → build → check:size → lint → scan:secrets → test，必须全绿 |
| `npm run export:check` | 校验导出文件可读性 |
| `npm run preview` | 预览前端构建产物 |

### 项目结构

```text
├── api/                     # Vercel Serverless 入口（index.ts）
├── web/                     # 前端 workspace
│   └── src/
│       ├── app/             # 路由、Provider、应用外壳（顶栏/抽屉/侧栏）
│       ├── features/        # 按业务域划分的功能模块（含公共 index 出口）
│       ├── components/      # 通用 UI、布局、三态、品牌矢量组件
│       ├── lib/             # API 客户端与工具
│       ├── config/          # 前端共享常量
│       ├── styles/          # 设计令牌与全局样式
│       └── types/           # API 契约类型
├── server/                  # 后端 workspace
│   └── src/
│       ├── config/          # 环境变量、常量、说明页与公告文案（docs/）
│       ├── db/              # 连接池、迁移执行器、迁移 SQL（001–019）
│       ├── middleware/      # requireAuth / requireRole / optionalAuth 等
│       ├── modules/         # 按业务域四层同构（routes/controller/service/repository）
│       ├── shared/          # 错误码、响应包络、分页、事务、校验原语
│       └── storage/         # 图片管线（校验 + WebP 重编码）
├── scripts/                 # 迁移、种子、初始化、质量门脚本
├── docs/                    # PRD / ARCHITECTURE / IMPLEMENTATION-PLAN / DEPLOYMENT / DOC_SYNC
├── CHANGELOG.md             # 变更记录
├── AGENTS.md                # 给 AI Agent 的项目级协作规则
└── README.md
```

### API 概览

所有端点前缀 `/api`，响应统一 `ApiEnvelope` 包络；写入类端点除注明外均需登录。完整请求/响应契约见 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)。

| 组 | 端点 | 说明 |
| --- | --- | --- |
| 元信息 | `GET /health`、`GET /meta/{guidelines,privacy,terms,announcements,about,disclaimer,product}` | 公开；说明页与公告文案单一真源 |
| 认证 | `POST /auth/register`、`/login`、`/logout`、`GET /auth/me`、`POST /auth/change-password` | 注册需邀请码；改密需登录 |
| 个人 | `GET /users/me`、`PATCH /users/me`、`DELETE /users/me`、`POST /users/me/erase` | 本人资料 / 注销 / 彻底擦除 |
| 公开 | `GET /users/:username`、`GET /users/:username/posts` | 公开个人页与其帖子 |
| 帖子 | `GET /posts?tab=&topic=`、`POST /posts`、`GET /posts/:id`、`PATCH /posts/:id`、`DELETE /posts/:id`、`GET /posts/:id/related` | 三 Tab 信息流、游标分页 |
| 互动 | `PUT` / `DELETE /posts/:id/like`、`/posts/:id/bookmark` | 幂等开关，计数同事务 |
| 评论 | `GET` / `POST /posts/:postId/comments`、`DELETE /comments/:id` | 单层、倒序游标、作者/管理员删除 |
| 通知 | `GET /notifications`、`GET /notifications/unread`、`POST /notifications/read` | 列表游标 / 未读数 / 全部已读 |
| 图片 | `POST /posts/:postId/images`（multipart，字段 `image`）、`DELETE /posts/:postId/images/:imageId`、`GET /images/:key` | 上传/删除需作者或管理员；读取带长缓存与禁止嗅探头 |
| 话题 | `GET /topics` | 目录（仅读侧） |
| 管理 | `GET /admin/whoami`、`GET` / `POST /admin/invite-codes`、`POST /admin/invite-codes/:id/revoke` | 整组 `requireAuth + requireRole(ROLE_ADMIN)` |
| 举报与申诉 | `POST /reports`、`GET /reports/mine`、`GET /admin/reports`、`POST /admin/reports/:id/decision` | 前两项需登录、只按会话身份过滤；后两项在管理组内，仅管理员可调用。决策只标记状态与答复，不做内容处置 |

### 质量门与测试

`npm run verify` 是**唯一交付入口**，六项全绿才可提交：

| 环节 | 内容 |
| --- | --- |
| `typecheck` | 前后端 TypeScript 类型检查 |
| `build` | Vite 构建 + 后端编译 |
| `check:size` | `web/src`、`server/src` 下 `.ts/.tsx ≤ 300 行`、`.css ≤ 400 行`；超预算须拆分文件，不得调高阈值 |
| `lint` | 硬规则 `R1` 模块导入边界 / `R2` 设计令牌（禁硬编码颜色）/ `R3` 导入扩展名 / `R4` 四处版本号一致；任一命中即失败 |
| `test` | `node:test` + PGlite 内存库，测试间互不影响、不连真实库 |

新增功能须同步新增/更新测试；新增源码文件须带 `SPDX-License-Identifier: AGPL-3.0-or-later` 头。版本号唯一真源是根 `package.json`，构建期注入 `__APP_VERSION__`，由 `R4` 保证四处同源。

### 部署

线上为 **Vercel + Neon**：`vercel.json` 把 `/api/:path*` 重写到 Serverless Function `api/index.ts`，其余路径回退到 `index.html`；前端静态产物构建至 `server/public/`，由 `includeFiles` 带上 `server/dist/**`。

关键约束（踩过的坑，详见 `docs/DEPLOYMENT.md`）：

- **不依赖原生编译模块**：`argon2` / `bcrypt` / `sharp` 等原生依赖在 Serverless 不保证可用，故口令哈希改用 `hash-wasm` 的纯 WASM Argon2id（`sharp` 仅用于构建期图片管线，走平台预编译层）。
- **请求体上限**：Vercel 硬上限 4.5 MB，故 `MAX_BODY_BYTES` 设为 4 MB、单图 3 MB。
- **生产迁移**：用 `npm run migrate:prod` 执行编译产物，不依赖 `tsx`；迁移只增不改历史。
- **AGPL 网络义务**：通过网络提供服务的运营者须向用户提供对应完整源码。站内页脚「源码」链接与「关于」页「许可与源码」区块共用 `/api/meta/about` 下发的同一地址（`licensing.sourceUrl`），部署方上线时须确认该链接可达；页面另写明链接不可访问时可留言索取对应版本。

托管平台从早前的 Render + Neon 改为 Vercel + Neon，原因是 Render 免费层自 2026 年起强制绑卡，而本项目无对公支付手段。

---

## 安全与隐私

- 口令用 **Argon2id** 单向哈希（参数随哈希串存储）；邀请码用 **HMAC-SHA256** 哈希存储、恒定时间比较；会话密钥、数据库凭据等全部经环境变量注入，仓库不含任何真实值。
- **权限一律在服务端校验**：路由组统一挂载 `requireAuth` / `requireRole(ROLE_ADMIN)`，前端隐藏控件只减少误触，不构成安全边界。
- 全部 SQL 参数化；跨表一致性用 `withTransaction` 事务边界；上传按魔术字节校验并重新编码。
- 会话 Cookie `HttpOnly` + `SameSite=Lax` + 生产环境 `Secure`；分层防刷（限流 / 蜜罐 / 失败限次 / 事件留痕）。
- 只采集用户名与口令，**不采集手机号、邮箱等联系方式**；因此无法提供「忘记密码邮件找回」——改密仅支持登录后自助修改。
- 五份协议与隐私说明如实披露：「公开内容意味着什么」「我们明确不做的几件事」、未实现能力不写成已实现。

完整安全设计见 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) §9，面向用户的说明见 [`server/src/config/docs/privacy.doc.ts`](./server/src/config/docs/privacy.doc.ts)。

> 本项目未经第三方安全审计，不建议用于处理敏感信息。发现安全隐患请通过[反馈与联系](#反馈与联系)告知，勿公开利用细节。

---

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [`docs/PRD.md`](./docs/PRD.md) | 产品定义、角色权限、功能与非功能需求、验收标准 |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 分层与模块边界、API 契约、数据模型、安全设计 |
| [`docs/IMPLEMENTATION-PLAN.md`](./docs/IMPLEMENTATION-PLAN.md) | 里程碑拆解、验证记录（`VR-Mx-xx`）、完成判据 |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | 环境变量、迁移、启动、备份与故障排查 |
| [`docs/DOC_SYNC.md`](./docs/DOC_SYNC.md) | 文档与版本同步规范（唯一真源 + 发布前检查清单） |
| [`AGENTS.md`](./AGENTS.md) | 给 AI Agent 的项目级协作规则 |
| [`CHANGELOG.md`](./CHANGELOG.md) | 版本与变更登记 |
| [`TRADEMARK.md`](./TRADEMARK.md) | 名称 / Logo / 图标的商标保留政策 |
| [`COPYRIGHT`](./COPYRIGHT) | 版权归属与许可文件对照 |
| [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md) | 第三方依赖许可清单 |

需求编号（`FR-*` / `NFR-*`）、验收编号（`AC-*`）、架构决策（`ADR-*`）、任务编号（`M#-S#-T#`）与验证记录（`VR-Mx-xx`）在多份文档间交叉引用，变更时按 `DOC_SYNC.md` 逐项同步。

---

## 版本与发布

采用语义化版本（SemVer）。**`v1.0.0` 是架构基线**（冻结的 v1.0 产品范围对应的首个正式发布）；`v1.1.0` 交付 `M3` 内容域；`v1.2.0` 交付 `M4` 互动域收尾；`v1.3.0` 交付 `M5` 补充能力收尾（私信 / 成就与每周热门 / 搜索 / 数据导出）并含社区公告分层与运营管理；**`v1.4.0` 交付 `M5.5` 收尾**（经验与 `L1`–`L50` 五段位等级，只升不降），同版本把每日签到正式取消并写明理由；**`v1.5.0` 交付 `M6` 收尾**（治理后台六分区、只追加审核日志、基础统计与权限回归），是本项目第一个面向运营者的治理版本。

| 版本位 | 触发条件 | 示例 |
| --- | --- | --- |
| 主版本 `X.0.0` | 架构基线变更、破坏性调整、冻结清单扩展或收缩、部署模型变化 | `1.2.0` → `2.0.0` |
| 次版本 `1.X.0` | 新增功能、落地新里程碑、新增端点、经迁移新增数据表 | `1.1.0` → `1.2.0` |
| 修订版本 `1.2.X` | 修复、优化、文档更新，不改变对外契约 | `1.2.0` → `1.2.1` |

约定：

- 标签格式 `vX.Y.Z`，与代码版本号一致；正式发布附 GitHub Release 说明。
- 版本号唯一真源是根 `package.json`；`web` / `server` 三个包、`APP_VERSION`、`package-lock.json` 由 `lint` 的 `R4` 强制同源，界面版本号由构建期注入。
- 主版本变更须走 `ADR`；表结构变更只新增迁移文件，不修改已执行迁移。
- **公告刻意不含版本号**（运营信息与代码版本解耦）；版本信息以 `CHANGELOG.md` 与 Release 为准。
- 公开部署、打 tag、发版等不可逆操作须单独审批后执行。

---

## 许可与第三方

**版权所有 © 2026 xiaoyu-hue**（GitHub: [@xiaoyu-hue](https://github.com/xiaoyu-hue)）。归属与许可对照见 [`COPYRIGHT`](./COPYRIGHT)。

本项目采用**代码与文档分离授权**：

| 对象 | 许可证 | 说明 |
| --- | --- | --- |
| **源代码**（`web/`、`server/`、`scripts/`、`api/`） | **AGPL-3.0-or-later** | GNU Affero 通用公共许可证 v3 或更高版本，含网络服务条款。全文见 [`LICENSE`](./LICENSE)。 |
| **文档与文字内容**（`docs/`、`README.md`、`CHANGELOG.md`、`AGENTS.md` 等说明性 Markdown） | **CC BY-NC-SA 4.0** | 署名—非商业性使用—相同方式共享 4.0 国际。全文与适用范围见 [`LICENSE-docs`](./LICENSE-docs)。 |
| **名称、Logo、应用图标与品牌卡（商标）** | **商标保留** | 不通过 AGPL 或 CC 授权，仅允许指名性合理使用。见 [`TRADEMARK.md`](./TRADEMARK.md)。 |
| **第三方组件与开发依赖** | 各自原有许可证 | 见 [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md)；分发时保留各依赖版权与许可声明。 |

> **AGPL-3.0 的网络义务**：通过网络提供本软件服务的运营者，须向用户提供对应的完整源码。本项目源码与三份许可文本同在本仓库；站内由**「关于」页「许可与源码」区块**写清三类授权的适用范围与源码地址，并由**页脚「源码」链接**直接指向仓库，两处复用 `/api/meta/about` 下发的同一地址，不会各写一份后漂移。部署方上线时须确认该链接可达；页面另已写明地址不可访问时可留言索取对应版本。
>
> **代码与文档许可相互独立**：代码允许商业使用（但衍生作品与网络服务须开源），文档本身**不允许商业性使用**（NC）。由于含 NC 条件，文档许可**不属于**「自由文化/开源」许可，准确表述为「采用 CC BY-NC-SA 4.0」。
>
> **商标与品牌资产单独保留**：AGPL 与 CC 均为著作权许可，**不授予商标权**。STARPAL 星聚的名称、Logo、应用图标为商标，其使用受 [`TRADEMARK.md`](./TRADEMARK.md) 约束，不随代码或文档的开源而开放。

---

## 致谢与依赖

### 致敬

星聚站在开源社区与既有社区产品积累的经验之上。以下项目为**设计思路与工程惯例的参考**，本项目未引入其代码或品牌资产，也不代表其背书或关联：

| 参考 | 借鉴了什么 |
| --- | --- |
| Discourse、GitHub Releases | 结构化更新通告的写法：类型标签、先摘要后明细、写明「对你的影响」 |
| Reddit、Discuit、Lemmy | 兴趣社区的形态，以及隐私说明 / 社区准则的章节骨架 |
| 微博、小红书 | 评论长度口径的现实对照 |
| OWASP | 口令哈希选型（Argon2id）与会话 Cookie 安全属性 |

感谢所有上游依赖的维护者与贡献者——没有他们的工作，一个由个人维护的小社区不可能以零付费成本稳定运行。也感谢每一位社区成员：这是一个邀请制、小规模、由真实的人组成的社区，你们的信任与反馈是项目保持克制、不夸大能力的理由。

本项目代码在 AI 编程助手辅助下编写，由运营者负责审阅、验证与发布；这一点在站内产品声明中同样如实披露。

### 依赖

精确版本以各 `package.json` 与 `package-lock.json` 为准；**完整逐包许可清单**见 [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md)。

| 类别 | 主要组件 | 许可证 |
| --- | --- | --- |
| 前端运行时 | React、React DOM、React Router、TanStack Query、Radix UI 原语、lucide-react | MIT / ISC |
| 构建与样式 | Vite、TypeScript、Tailwind CSS、PostCSS、Autoprefixer | MIT / Apache-2.0 |
| 后端运行时 | Express、pg、hash-wasm、sharp、multer、dotenv | MIT / BSD-2-Clause / Apache-2.0 |
| 测试 | Node 内置 `node:test`、tsx、PGlite | MIT / Apache-2.0 |
| 数据库与托管 | PostgreSQL、Vercel、Neon | 服务，非代码依赖 |

上述直接与传递依赖均为 MIT / ISC / Apache-2.0 / BSD / MPL-2.0 / CC-BY-4.0 等宽松或弱传染许可，**可与 AGPL-3.0 组合，无冲突**。分发时须保留各依赖的版权声明与许可文本（Apache-2.0 另须随附 `NOTICE`，MPL-2.0 文件级修改须以 MPL 公开）。

---

## 贡献

本项目为个人维护的邀请制社区，**暂不开放外部账号注册与公开协作入口**，但欢迎通过[反馈与联系](#反馈与联系)提出建议或报告问题。若你 fork 了本仓库自行修改，请遵守以下约定：

1. 需求增删同步更新 PRD 编号与追踪矩阵；架构变更登记 ADR。
2. 表结构变更只新增迁移文件，不修改已执行迁移。
3. 接口变更同步更新架构文档端点清单与前后端类型定义。
4. 代码与 `README` / `CHANGELOG` 同步更新，并按 [`docs/DOC_SYNC.md`](./docs/DOC_SYNC.md) 逐项检查。
5. 新增功能同时新增/更新测试；验证记录须包含实际执行的命令与输出，未执行项标记「未验证」。
6. `npm run verify` 全绿才可交付；新增源码带 SPDX 头。
7. 公开部署、外部账号注册、生产数据清除、既有代码覆盖等不可逆操作须单独审批。
8. 衍生作品与网络服务须遵守 AGPL-3.0 的开源与源码提供义务；文档另受 CC BY-NC-SA 4.0 的非商业与相同方式共享约束；名称与 Logo 的使用见商标政策。

---

## 反馈与联系

站内私信社区长兼管理员 **@Solvyre**（留言式，对方刷新可见；也可在社区公告帖下留言）。举报具体帖子或评论用内容旁的「举报」，申诉某项处理用「我的提交 → 提交申诉」，答复也在「我的提交」里看。涉及个人信息的内容一律使用站内渠道，不要通过代码托管平台的公开 Issue 提交——仓库已公开，公开 Issue 对所有人可见。

安全漏洞请勿公开披露细节，先通过上述渠道私下告知。
