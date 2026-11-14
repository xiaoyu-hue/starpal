# 变更记录

本文件记录项目的重要变更，格式遵循 [Keep a Changelog](https://keepachangelog.com/)。版本号遵循语义化版本约定。所有条目使用过去时态描述已发生的变更；计划中的工作只在 `[Unreleased]` 中列出，不计为已交付。

## [Unreleased]

### 新增（M3-S3 图片前端与渲染）

- 新增 `ImagePicker`：多选、本地预览、逐张移除；选中即校验类型（JPG / PNG / WebP / AVIF）与单张 3 MB、单帖 9 张上限，预览用 object URL 并在组件卸载或换图时释放，避免整张图滞留内存。
- 发帖流程按接口契约分两步：先在浏览器里排队，帖子创建成功后再逐张上传；按钮实时显示「上传图片 n/m」。上传失败**不回滚帖子**——正文已经写完，为一张图丢掉内容是最差选择；改为跳转详情页提示失败张数，并提供「去编辑页补传」入口。
- 编辑页图片即时生效：选中即上传、点叉即删除，界面明确标注「无需点保存」，避免用户以为还要再提交一次。
- 新增 `DELETE /api/posts/:postId/images/:imageId`（作者或管理员）：与上传共用 `ensurePostEditable` 与帖子级事务锁，删除后 `sort_order` 留下空位不重排（重排会撞唯一约束），后续追加取 `MAX(sort_order) + 1`。
- 帖子投影的 `images` 由键数组改为对象数组（`id` / `key` / `width` / `height`），列表与详情同形；尺寸用于前端预留占位框，`id` 供作者删除指定图片。
- 新增 `components/content/PostImages.tsx`：详情页单图整宽、多图两列网格；宽高比收敛到 0.75–1.91 并限高（详情 560 px、卡片封面 420 px），配合 `loading="lazy"`、`decoding="async"` 与「标题 配图 N」的 `alt`，图片加载完成不再推动正文。
- 信息流卡片显示首图封面，固定比例占位，卡片高度不随图片加载抖动。
- 实测：接口层 24 项断言全通过（投影形状、上传、读取、越权 403、未登录 401、非法 id 400、删除后 404、删除后追加 201、`post_images` 与 `image_blobs` 各 2 行零孤儿）；真实 Chromium 走完「选两张图 → 发布 → 详情两张自然尺寸加载 → 编辑页删一张 → 首页封面加载」，移动端 390 px 无横向溢出，控制台 0 错误。

### 新增（M3-S3 图片上传管线 · 后端闭环）

- 新增 `storage/image-pipeline.ts`：魔术字节判真类型（JPEG / PNG / WebP / AVIF，SVG 与 GIF 一律拒绝）+ `sharp` 解码结果交叉校验，防「头部伪装 + 内容不符」；`limitInputPixels` 设 4000 万上限阻止解压炸弹。
- 统一重编码为 WebP（质量 82、长边 ≤ 2048、不放大），首轮超限降到 70 再试一次。重编码同时完成两件事：压缩体积、剥离 EXIF / GPS / 设备型号。
- `rotate()` 先按 EXIF `Orientation` 摆正再丢弃该标记，避免手机竖拍照片在网页上横躺。
- 新增 `middleware/upload.ts`：multer 内存缓冲（不落盘）、`fileSize` 显式 3 MB、`files: 1`、`fields: 0`；multer 错误翻译为 `413` / `400` 统一包络。`bodyLimit` 放行 multipart 并兜住总请求体 4 MB，读请求不再构造 JSON 解析器。
- 新增 `modules/uploads`：`POST /api/posts/:postId/images`，需作者或管理员。权限先于管线判定；重编码放在事务**之外**（CPU 密集，避免占用数据库连接）；`post_images` 与 `image_blobs` 在同一事务内提交，`pg_advisory_xact_lock` 串行分配排序位。
- `posts` 模块导出 `ensurePostEditable`，与 `updatePost` 共用同一 `authorize`，避免权限规则在模块间漂移。
- 单帖图片上限 9 张（`POST_IMAGES_MAX`），超限返回 `409`。
- 实测 20 项断言全通过：带 EXIF 与 `Orientation=6` 的 JPEG 上传后尺寸由 1200×900 变为 900×1200、读回 `exif=false`；文本伪装与 SVG 均 `415`、3.6 MB 超限 `413`、未登录 `401`、他人帖子 `403`、第 10 张 `409`；并发 3 张后排序位 0–5 连续无重复；`post_images` 与 `image_blobs` 各 9 行、零孤儿。

### 修复（工程）

- `.gitignore` 中的 `uploads/` 规则会匹配任意层级同名目录，导致新增的 `server/src/modules/uploads/` 源码目录被整目录忽略、不会进入版本控制。改为锚定根路径 `/server/uploads/`——ADR-014 之后项目已不写磁盘，该规则仅防历史本地目录误入库。

### 新增（M3-S3 图片存储 · 读写通道）

- 新建 `server/src/storage`：`StorageAdapter` 接口（`put` / `get` / `remove`）与 `postgres-bytea` 实现，单例注入点收敛到 `storage/index.ts`，不建工厂或注册机制。实现接受 `Pool | PoolClient`，使上传流程能在调用方事务内写字节，失败整体回滚。
- `put` 携带 `imageId`：`image_blobs` 以 `image_id` 为主键并外键引用 `post_images`，写字节前必须已有元数据行；对象存储实现会忽略该字段，接口仍可替换（已写入架构 §8.2）。
- `remove` 只删字节、保留元数据行，供上传回滚与存储迁移使用；正常删除仍走 `post_images` 级联。
- 新建 `modules/images`：`GET /api/images/:key` 经适配器返回字节，`Content-Type` 取自落库值，携带 `Cache-Control: public, max-age=31536000, immutable`、`X-Content-Type-Options: nosniff` 与 `Content-Disposition: inline`。
- 畸形键（非 32 位小写 hex）在服务层直接按 `NOT_FOUND` 处理，不触达数据库；未知键与路径穿越均返回统一错误包络。
- 实测：真实 PNG 写入事务后读回字节完全一致（SHA-256 相同）；同键重复写入被拒；704.5 KB 样本写入 19 ms、读取 6 ms；700 KB 图片 HTTP 单次 6–8 ms、10 并发全部 200。

### 新增（M3 内容域 · 进行中）

- **存储决策落地（`ADR-014`）**：图片二进制改为存 PostgreSQL `image_blobs.data`，不再写本地磁盘。依据：部署于 Vercel Serverless，无可写持久目录，且函数请求体硬上限 4.5 MB；候选对象存储中 Cloudflare R2 需绑卡、Supabase Storage 免费层闲置 7 天即暂停。
- 架构文档 §8 重写：适配器实现由 `local-disk` 改为 `postgres-bytea`，新增 §8.4「迁移至对象存储的触发条件」（图片总量 > 500 MB）。
- PRD / 部署指南 / 实施计划同步：移除 `UPLOAD_DIR`；单图上限 `5 MB → 3 MB`、请求体上限 `6 MB → 4 MB`（须低于平台 4.5 MB，否则请求在平台层即被拒，应用校验不会执行）。
- 迁移 `003_topics_posts.sql`：`topics`（slug 与名称格式检查）与 `posts`（状态、非空、非负计数、软删一致性约束 + 四类部分索引）；九个内置话题随迁移写入，满足 `FR-TOPIC-01`「初始化迁移后可直接查询」。
- 迁移 `004_post_images.sql`：`post_images`（32 位随机 `storage_key`、MIME 白名单、同帖排序唯一）与 `image_blobs`（一对一、级联删除）。
- 隔离环境（WASM Postgres）实测：两迁移可执行、九话题正确、九条约束负向用例全部被拒、二进制读写与级联删除正常。

### 新增（M3-S2 帖子 API）

- 新建 `modules/posts`：routes / controller / service / schema / types 五件套，仓储按「写入与单条读取」`post.repository`、「列表与分页」`post.feed.repository` 拆分，共用 `post.projection` 投影，单文件均在体积预算内。
- `POST /api/posts`：服务端校验标题（≤ 180）、正文（≤ 20000）、话题存在性，摘要由服务端按码点截断生成（`FR-POST-06`），事务内写入并读回。
- `GET /api/posts`：三 Tab 键集分页——`latest` 按创建时间、`popular` 按「净赞为主 + 时间衰减」限 7 天窗、`recommended` 按 `0.4×话题亲和度 + 0.35×新鲜度 + 0.25×热度` 限 30 天窗；权重与衰减系数集中于 `config/constants`。
- `GET /api/posts/:id`：可见性判定——`published` 公开、`draft` 仅作者、`removed` 仅管理员、`deleted` 一律不可见，不可见统一返回 `NOT_FOUND`，不通过状态差异泄露他人内容（`FR-POST-04`）。
- `PATCH` / `DELETE /api/posts/:id`：作者或管理员；越权返回 `FORBIDDEN`，删除为软删除（`status` 与 `deleted_at` 同步置位）。
- `GET /api/posts/:id/related`：同话题近期帖子，限量 5 条。
- 新增 `middleware/optional-auth`：读端点匿名可读、登录者额外可见自身草稿与管理员可见的已移除内容。
- `modules/feed` 退役，列表能力并入 `posts`——同一 URL 前缀由同一模块拥有，避免游标规则与可见性判定分处两地。
- 个人页接入真实数据：`GET /api/users/:username/posts` 返回已发布帖子分页，`postCount` 改为与列表同口径的真实计数。
- 生产库实测（测毕物理清理，`posts=0`）：三 Tab 排序互不相同且符合 PRD 定义；`limit=2` 两页拼接无重复无跳项；匿名/越权/软删除三种可见性符合预期；HTTP 参数校验与错误码逐项通过。

### 新增（M3-S4 话题目录 · 读侧）

- 新建 `modules/topics`（types / repository / service / controller / routes / barrel），提供 `GET /api/topics`：返回 `id / slug / nameZh / nameEn / description / icon / sortOrder / postCount`。
- `postCount` 与信息流可见性**同口径**推导（已发布、未软删、话题未归档、作者未停用），避免「话题页显示 3 篇、点进去只有 2 篇」；单条聚合语句完成，不做逐话题 `COUNT`。
- 帖子按话题筛选仍走 `/api/posts?topic=<slug>`，不新增第二套筛选实现——排序与可见性规则无法分叉。
- 管理端增删改与 `moderation_logs` 留痕延后至完整 `M3-S4`，本段只交付发帖与浏览所必需的读侧。

### 新增（M3-S5 前端内容域）

- **发帖 / 编辑页**（`features/posts`）：标题（≤ 180）、正文（≤ 20000）、话题单选（原生 radio + label，方向键可用）、字数计数、首提后才显示字段错误、服务端错误原样回显；发布成功跳详情，编辑成功跳回原帖。
- **详情页**：完整正文保留段落换行、作者与发布时间（有编辑则标注编辑时间）、话题徽章（可点进话题页）、作者 / 管理员可见编辑与删除（删除走二次确认对话框）、同话题相关帖子、评论区占位（明示尚未开放）。
- **话题目录与话题详情**（`features/topics`）：`/topics` 展示九个分类及真实篇数；`/topics/:slug` 为描述 + 三 Tab 筛选信息流，筛选在服务端完成。
- **信息流重构**：抽出 `FeedView`（待加载 / 失败 / 离线预览 / 空 / 有内容五态的唯一实现）与 `useFeedSentinel`（无限滚动），首页、话题页共用，避免同一套状态分支写多遍。
- 卡片可进入详情（整卡点击 + 标题为主锚点 + 回车键可达），作者名链接到个人页；收藏与分享仍为禁用态，不做无反馈按钮。
- **个人页接入真实内容**：`GET /api/users/:username/posts` 支持游标分页，响应形状与 `/api/posts` 同构；页面按真实列表渲染并可「加载更多」。
- **滚动位置恢复**：`useScrollRestore` 以 `sessionStorage` 按 Tab / 话题分键记忆，从详情返回回到离开位置，关闭标签页即丢弃。
- 外壳去硬编码：侧栏话题分类改读 `/api/topics`（原先维护一份会与数据库漂移的标签表，且文案停在「将在 M3 接入真实数据」）；右栏「热门话题」按真实篇数排序，无内容时如实空态。
- 分包：`posts` 独立 chunk（约 16 KB），首页不再连带发帖与详情代码；话题目录因被左右栏共用而随主包加载，故改静态导入，不再假装懒加载。

### 修复

- **自然语言字段被误判为非法**：`title` / `body` / `displayName` / `biography` 沿用了「禁止内部空白」的严格规则，导致含空格的标题（如「M3 前端 内容域」）与多行正文被 `400` 拒绝（`不得包含空白字符`），显示名带空格同样注册失败。现对四类自然语言字段显式放开内部空白，`username` / `inviteCode` / `password` 规则不变。
- **个人页帖子响应形状不一致**：原先把整个分页对象塞进 `data`、`meta` 恒为空，前端无法翻页。现改为 `data` 为列表、`meta` 承载游标，与 `/api/posts` 完全同构。
- **失效配置清理**：`UPLOAD_DIR` 自 `ADR-014` 起已无任何读取点（图片改为入数据库），从默认值与 `env` 中移除；`MAX_UPLOAD_BYTES` / `MAX_BODY_BYTES` 默认值对齐文档（3 MB / 4 MB）；`.env.example` 同步删除过期项。
- 侧栏与右栏的过期文案（「话题目录将在 M3 接入真实数据」「暂无真实话题数据」）已随真实数据接入移除。

## [1.0.3] - 2026-11-14

### 修复

- **恢复 `LICENSE` 为 GNU 官方原文（零前置内容）**：1.0.2 在 `LICENSE` 顶部加入版权声明块，导致 GitHub 许可证识别器无法匹配，仓库许可证徽章退化为 "Other"（`spdx_id: NOASSERTION`）。现将 `LICENSE` 恢复为与 gnu.org 逐字节一致的官方全文。
- 新增 `COPYRIGHT` 文件独立承载版权归属（中文 + 英文 AGPL 标准程序附注、许可文件对照表），不影响 `LICENSE` 的许可证识别。
- README 许可段增加指向 `COPYRIGHT` 的链接。
- 版本号 `1.0.2 → 1.0.3`（属修复类改动）。

## [1.0.2] - 2026-11-14

### 许可与合规

- 补全**版权人声明**：`LICENSE` 顶部增加 `Copyright (C) 2026 xiaoyu-hue` 与 AGPL 标准的程序附注（正文仍为 GNU 官方全文，未作改动）；`LICENSE-docs`、`README.md`、`THIRD-PARTY-NOTICES.md` 均补入版权行。
- 三个 `package.json` 增加 `author` 字段。
- 重写 `LICENSE-docs`：明确列出适用范围（含根目录规格确认书与调研报告）、补入免责声明、修正机翻措辞、补英文标准许可声明。
- 修正 README 中「本项目源码公开于本仓库，满足该义务」的不准确表述，改为对部署方的真实要求。
- 版本号 `1.0.1 → 1.0.2`（属文档/管理类改动）。

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
