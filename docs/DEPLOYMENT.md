# 星聚 STARPAL · 部署与配置指南

| 项目 | 内容 |
| --- | --- |
| 版本 | v1.0 |
| 文档状态 | 基线（Baseline） |
| 关联文档 | [产品需求文档](./PRD.md) · [系统架构设计](./ARCHITECTURE.md) · [实施计划](./IMPLEMENTATION-PLAN.md) |

---

## 1. 文档说明

本文覆盖环境变量、PostgreSQL 配置、数据库迁移与种子、目录权限、开发与生产启动、反向代理、备份恢复、清理任务与故障排查。全部配置值由部署方在运行环境中提供，仓库中不包含任何真实凭据。

文中出现的阈值与端口为**设计默认值**，可按部署策略调整；调整后须同步更新 `server/src/config/constants.ts` 与本文。

---

## 2. 运行环境要求

| 项 | 要求 | 说明 |
| --- | --- | --- |
| Node.js | 22 LTS | 版本由 `.nvmrc` 与 `engines.node` 锁定；开发与部署环境保持一致 |
| npm | 随 Node.js 提供 | 依赖版本由 lockfile 固定 |
| PostgreSQL | 可达实例 | 需具备建表、建索引、创建视图权限；迁移由应用执行 |
| 文件系统 | 可写目录 | 上传目录须位于 Web 根目录之外，并挂载持久卷 |
| 反向代理 | 可选 | 用于终止 TLS、限制请求体大小、转发至应用端口 |
| 浏览器 | 现代桌面 / 移动浏览器 | 响应式 Web，无需安装客户端 |

系统不依赖外部身份服务、验证码服务、对象存储、缓存服务、消息队列或分析平台。

---

## 3. 配置文件规范

以下文件由实现阶段落地，内容规范如下。仓库只保留**变量名占位**，不含真实值。

### 3.1 `.nvmrc`

```text
22
```

配合各包 `package.json` 中的 `engines.node` 声明，保证开发、构建与部署使用同一主版本。不使用高于 22 的主版本，以避免引入要求更高运行时的依赖。

### 3.2 `.env.example`

```dotenv
# 运行环境
NODE_ENV=development
PORT=3000

# 数据库
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>

# 会话
SESSION_SECRET=<由部署方生成的高熵随机值>
SESSION_TTL_HOURS=168

# 注册与防刷
INVITE_CODE=<由部署方设置并自行分发>
RATE_LIMIT_WINDOW_SECONDS=3600
RATE_LIMIT_MAX=20
LOGIN_FAIL_MAX=5
SECURITY_EVENT_RETENTION_DAYS=30

# 上传
UPLOAD_DIR=./server/uploads
MAX_UPLOAD_BYTES=5242880
MAX_BODY_BYTES=6291456
PUBLIC_DIR=./server/public

# 初始管理员（仅初始化脚本读取，不常驻配置）
ADMIN_USERNAME=<由部署方设置>
ADMIN_PASSWORD=<由部署方设置>
```

> `SESSION_SECRET`、`INVITE_CODE`、`ADMIN_PASSWORD` **不设可用默认值**：变量缺失或为空时，进程启动校验须直接失败。初始化脚本不输出凭据内容。

---

## 4. 环境变量表

| 变量 | 必填 | 设计默认值 | 说明 | 安全级别 |
| --- | :---: | --- | --- | --- |
| `NODE_ENV` | 是 | `development` | `development` / `test` / `production`；影响 Cookie 的 `Secure` 属性与错误详情 | 公开 |
| `PORT` | 否 | `3000` | 应用监听端口 | 公开 |
| `DATABASE_URL` | 是 | 无 | PostgreSQL 连接串，格式见 §5.2 | **敏感** |
| `SESSION_SECRET` | 是 | 无 | 会话签名密钥，高熵随机值 | **敏感** |
| `SESSION_TTL_HOURS` | 否 | `168` | 会话有效期（小时） | 公开 |
| `INVITE_CODE` | 是 | 无 | 注册邀请码，由部署方分发，不进入仓库 | **敏感** |
| `RATE_LIMIT_WINDOW_SECONDS` | 否 | `3600` | 速率限制统计窗口（秒） | 公开 |
| `RATE_LIMIT_MAX` | 否 | `20` | 窗口内同一来源摘要允许的请求数 | 公开 |
| `LOGIN_FAIL_MAX` | 否 | `5` | 登录失败次数上限，超过后临时限制 | 公开 |
| `SECURITY_EVENT_RETENTION_DAYS` | 否 | `30` | 安全事件与过期会话的保留期（天） | 公开 |
| `UPLOAD_DIR` | 是 | `./server/uploads` | 图片目录，须在 Web 根目录之外 | 公开 |
| `MAX_UPLOAD_BYTES` | 否 | `5242880` | 单文件大小上限（字节） | 公开 |
| `MAX_BODY_BYTES` | 否 | `6291456` | 请求体总量上限（字节），须大于单文件上限并计入多图余量 | 公开 |
| `PUBLIC_DIR` | 否 | `./server/public` | 前端构建产物目录 | 公开 |
| `ADMIN_USERNAME` | 初始化时 | 无 | 初始管理员用户名，仅由一次性脚本读取 | **敏感** |
| `ADMIN_PASSWORD` | 初始化时 | 无 | 初始管理员密码，仅由一次性脚本读取 | **敏感** |

### 4.1 启动校验

`server/src/config/env.ts` 在进程启动时执行：

1. 读取全部变量；
2. 校验必填项存在且非空；
3. 校验数值型变量为正整数、布尔与枚举取值合法；
4. 校验 `MAX_BODY_BYTES` ≥ `MAX_UPLOAD_BYTES`；
5. 校验上传目录可写、产物目录可读；
6. 任一校验失败即终止启动并输出可定位的错误信息（不输出变量值）。

### 4.2 凭据管理约束

| 约束 | 说明 |
| --- | --- |
| 不硬编码 | 密钥、口令、邀请码、连接串不得出现在源码、迁移、种子、测试夹具或文档中 |
| 不入库 | `.env`、`uploads/`、`public/`、`node_modules/` 纳入 `.gitignore` |
| 最小可见 | 初始化脚本只在执行期读取管理员凭据，不打印、不回显、不写日志 |
| 轮换 | 会话密钥轮换会使既有会话失效；邀请码轮换不影响已有账号 |
| 摘要存储 | 速率限制与登录失败计数以不可逆摘要标识来源，不长期保留原始网络地址 |

---

## 5. PostgreSQL 配置

### 5.1 实例准备

在数据库实例上创建专用账号与数据库（示例，按实际环境调整）：

```sql
CREATE ROLE starpal_app LOGIN PASSWORD '<由部署方设置>';
CREATE DATABASE starpal OWNER starpal_app;
```

要求：

- 应用账号具备建表、建索引、建视图与读写权限；不需要超级用户权限。
- 开发、测试、生产使用**相互独立**的数据库，不共用同一 schema。
- 测试库在每次集成测试前重建或清理，避免用例间污染。

### 5.2 连接串格式

```text
postgresql://<user>:<password>@<host>:<port>/<database>
```

连接串经 `DATABASE_URL` 注入。连接池由 `server/src/db/pool.ts` 统一管理，不在业务模块内创建连接。生产环境按实例规格调整池大小，不作为业务配置项暴露。

### 5.3 迁移与种子

| 步骤 | 命令 | 说明 |
| --- | --- | --- |
| 1 | `npm run migrate` | 按序执行 `migrations/` 下未应用的 SQL，事务内执行，结果写入 `schema_migrations` |
| 2 | `npm run seed`（可选） | 写入九个内置话题与少量带「示例」标记的演示帖 |
| 3 | 结构核对 | 对照 [ARCHITECTURE.md §7.3](./ARCHITECTURE.md#73-表定义v10-冻结共-18-张) 核对 18 张表与索引 |
| 4 | 视图核对 | 确认 `weekly_highlights`、`moderation_public_log` 视图存在 |

规则：

- 迁移文件**只追加**，不修改已执行迁移；回滚以新增补偿迁移实现。
- 已应用版本不重复执行；迁移失败时整体回滚，不留下半应用结构。
- 种子与结构迁移分离，生产环境可跳过种子，让空态自然生效。

### 5.4 初始管理员

```bash
npm run init:admin
```

| 约束 | 说明 |
| --- | --- |
| 一次性 | 脚本检测管理员已存在时直接退出，不覆盖既有账号 |
| 凭据来源 | `ADMIN_USERNAME` / `ADMIN_PASSWORD` 由环境变量注入 |
| 不回显 | 脚本不打印凭据，不写入日志 |
| 无公开入口 | 系统不提供管理员注册端点，角色提升只能由现有管理员或初始化脚本完成 |
| 执行后 | 初始化完成后，应从运行环境中移除管理员密码变量，仅保留账号 |

---

## 6. 目录与权限

```text
server/
├── uploads/      # 图片文件，运行期写入，纳入 .gitignore
└── public/       # 前端构建产物，纳入 .gitignore
```

| 要求 | 说明 |
| --- | --- |
| 位置 | `UPLOAD_DIR` 须位于 Web 根目录之外，不由静态托管直接暴露 |
| 权限 | 目录可写但**无执行权限**；文件以随机名与固定扩展名写入 |
| 读取 | 图片经受控路由读取，响应携带禁止类型嗅探的安全头 |
| 持久化 | 该目录须挂载持久卷；环境重建时须从备份恢复 |
| 一致性 | `post_images.storage_path` 与磁盘文件一一对应；删除帖子 / 移除图片时同步清理 |

> 未挂载持久卷时，环境重建会导致图片丢失；数据库引用仍在但文件缺失。此限制已登记于 [PRD §10](./PRD.md#10-已知限制与风险)。

---

## 7. 开发启动

```bash
nvm use
npm install                 # web/ 与 server/ 分别执行
npm run migrate
npm run seed                # 可选
npm run init:admin
npm run dev
```

开发模式由两个进程组成：

| 进程 | 职责 |
| --- | --- |
| 前端开发服务器 | 提供页面与热更新，将 `/api` 代理至后端端口 |
| 后端 API 进程 | 提供 `/api`、健康检查与受控图片路由 |

代码树、构建流程与 API 契约始终保持分离；进程分离仅限开发期。

---

## 8. 构建与生产启动

```bash
npm run build       # 前端产物输出至 PUBLIC_DIR；后端编译
npm run start       # Express 单进程启动
GET /api/health     # 健康检查
```

生产启动顺序：

1. 校验环境变量与目录权限，失败即终止；
2. 建立数据库连接池并检查可达性；
3. 挂载中间件链（顺序见 [ARCHITECTURE.md §5.4](./ARCHITECTURE.md#54-中间件链顺序固定)）；
4. 托管前端静态产物与 SPA 回退路由；
5. 挂载 `/api` 路由与受控图片路由；
6. 启动应用内清理任务（过期会话、安全事件、孤儿文件）；
7. 监听 `PORT`。

单进程同时托管静态资源与 API，部署单元为一个进程 + 一个数据库 + 一个持久目录。

---

## 9. 反向代理与 TLS

反向代理为可选项，用于终止 TLS、统一请求体限制与转发。以下为最小示例，按实际环境调整：

```nginx
server {
    listen 443 ssl;
    server_name <域名>;

    # TLS 证书由部署方配置

    client_max_body_size 6m;   # 与 MAX_BODY_BYTES 保持一致

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

| 约束 | 说明 |
| --- | --- |
| 请求体限制 | 代理层限制须与 `MAX_BODY_BYTES` 一致，避免两层限制不一致导致难以定位的 413 |
| 来源标识 | 限流使用转发头解析来源并做不可逆摘要，不长期保留原始地址 |
| 协议传递 | 生产环境通过 `X-Forwarded-Proto` 判定，使会话 Cookie 启用 `Secure` |
| 静态资源 | 可由代理直接缓存前端产物，但图片路由仍须经应用的受控读取路径 |

---

## 10. 备份与恢复

### 10.1 备份内容

| 对象 | 方式 | 说明 |
| --- | --- | --- |
| 数据库 | 逻辑备份工具导出 | 包含全部表、约束、索引与视图定义 |
| 图片目录 | 文件级备份（归档或同步） | 与数据库备份保持同一时间点 |
| 配置 | 环境变量清单（不含值） | 值由部署方在密钥管理设施中保存 |

### 10.2 备份命令（示例）

```bash
# 数据库逻辑备份
pg_dump "<DATABASE_URL>" > starpal-YYYYMMDD.dump

# 图片目录归档
tar -czf uploads-YYYYMMDD.tar.gz -C <UPLOAD_DIR> .
```

时间戳由执行环境生成，不在文档或脚本中硬编码。备份文件须存放于与实例分离的持久位置。

### 10.3 恢复流程

1. 停止应用进程；
2. 恢复数据库（新建空库或清理目标库后导入）；
3. 恢复图片目录至 `UPLOAD_DIR`；
4. 执行迁移至最新版本；
5. 校验 `post_images` 引用与磁盘文件数量一致；
6. 启动应用并访问健康检查；
7. 按 [实施计划 §5.1](./IMPLEMENTATION-PLAN.md#51-验收项与里程碑映射) 抽查关键验收项。

### 10.4 一致性校验

| 检查 | 方法 |
| --- | --- |
| 引用存在性 | 逐条比对 `post_images.storage_path` 与目录文件 |
| 孤儿文件 | 目录中未被任何引用指向的文件，由清理任务处理 |
| 计数一致 | 抽样比对 `posts.like_count` / `comment_count` 与明细行数 |
| 迁移一致 | `schema_migrations` 中的已应用版本与 `migrations/` 目录一致 |

---

## 11. 用户数据导出

`GET /api/export?format=md|json` 导出当前登录用户的全部内容：帖子、评论、图片引用、资料字段。导出为普通标准文件，可被外部工具读取，不依赖本系统即可解析。

- 导出范围严格限定为本人数据，不含其他用户内容与内部字段。
- `npm run export:check` 用于校验导出文件的可读性与边界。
- 导出是数据可移植性的主要保障，应纳入定期备份流程一并留存。

---

## 12. 清理任务

清理在应用进程内完成，不引入外部调度服务：

| 对象 | 条件 | 动作 |
| --- | --- | --- |
| `sessions` | `expires_at` 已过 | 删除 |
| `security_events` | 超过 `SECURITY_EVENT_RETENTION_DAYS` | 删除 |
| 孤儿图片文件 | 无 `post_images` 引用且超过宽限期 | 删除 |
| 已软删除内容 | 按保留策略处理 | 保留行，不物理移除，除非用户主动触发彻底擦除 |

---

## 13. 待配置项清单

以下项目须由部署方在发布前完成，代码与文档不预置其值：

| 项 | 关联章节 |
| --- | --- |
| 全部环境变量的真实值 | §4 |
| 初始管理员凭据与执行 | §5.4 |
| 邀请码设置与分发 | §4 |
| 持久卷挂载与目录权限 | §6 |
| 反向代理与 TLS 证书 | §9 |
| 备份计划、执行频率与保留期 | §10 |
| 社区准则与隐私说明的最终文案 | [PRD §3.3 / §4.12](./PRD.md) |
| 可选自托管人机验证（默认关闭） | [ARCHITECTURE §10.1](./ARCHITECTURE.md#101-预留扩展点) |
| 监控接入（基于健康检查端点，可选） | §8 |
| 项目许可文件 | `README.md` |

---

## 14. 故障排查

| 现象 | 可能原因 | 排查步骤 |
| --- | --- | --- |
| 启动即失败 | 必填环境变量缺失或非法 | 查看启动校验输出；逐项核对 §4 表格；确认 `MAX_BODY_BYTES` ≥ `MAX_UPLOAD_BYTES` |
| 数据库连接失败 | 连接串错误、实例不可达、权限不足 | 核对 `DATABASE_URL` 格式；确认账号具备建表权限；检查网络可达性 |
| 迁移失败 | 已执行迁移被改动、目标库残留结构 | 核对 `schema_migrations`；使用空库重试；不得手工改表 |
| 重复执行迁移产生冲突 | 执行器幂等性异常 | 检查已应用版本记录；以新增补偿迁移修正 |
| 上传被拒（413 / 415） | 请求体或文件超限、类型不在白名单 | 核对三层限制值；确认代理层与应用层一致；检查文件真实类型而非扩展名 |
| 图片 404 | 文件未落盘、持久卷未挂载、引用路径不一致 | 比对 `post_images.storage_path` 与目录；恢复备份（§10.3） |
| 登录后立即失效 | Cookie 属性与协议不匹配 | 确认 `NODE_ENV`、`Secure`、`SameSite` 与 `X-Forwarded-Proto` 配置 |
| 深层路由刷新 404 | SPA 回退路由未生效 | 确认静态托管与回退规则挂载顺序 |
| 正常用户被限流 | 速率阈值过低或来源摘要粒度不当 | 核对 `RATE_LIMIT_*` 与转发头解析；检查蜜罐是否被辅助技术误填 |
| 计数与列表不一致 | 存在绕过服务层的写入 | 以明细重算计数；补充集成用例；检查事务边界 |
| 空态不出现 | 种子数据被执行 | 生产环境跳过 `seed`；核对演示内容标记 |
| 管理端点返回 403 | 角色未初始化或会话未刷新 | 重新登录；核对 `roles` 与初始管理员脚本执行结果 |

---

## 15. 发布前安全检查表

| 检查项 | 判定 |
| --- | --- |
| 仓库无真实凭据、密钥、邀请码、口令明文 | 待检查 |
| `SESSION_SECRET` 与 `INVITE_CODE` 为部署方设置的高熵值 | 待检查 |
| 会话 Cookie 启用 `HttpOnly` / `SameSite` / 生产环境 `Secure` | 待检查 |
| 上传目录位于 Web 根之外且无执行权限 | 待检查 |
| 上传三层大小限制与代理层一致 | 待检查 |
| 魔术字节校验与重新编码生效，元数据被剥离 | 待检查 |
| 全部管理端点均挂载角色校验 | 待检查 |
| 错误响应不含堆栈、SQL 与内部路径 | 待检查 |
| 安全响应头（含禁止类型嗅探）已启用 | 待检查 |
| 备份与恢复流程已实际演练 | 待检查 |
| 演示内容标记清晰、空态可复现 | 待检查 |
| 隐私说明与社区准则已审定并可达 | 待检查 |

---

## 16. 版本升级流程

```text
1. 阅读 CHANGELOG 与对应 ADR
2. 备份数据库与图片目录（§10.2）
3. 在测试环境执行新增迁移并回归
4. 更新依赖（如有）并记录用途与替代方案
5. 执行 build → migrate → start → 健康检查
6. 按回归触发条件执行用例（见实施计划 §5.3）
7. 同步更新 README、CHANGELOG 与相关文档
8. 记录验证结果；未执行项标记为「未验证」
```

任何涉及表结构的升级只通过新增迁移完成；任何涉及接口契约的升级须同步更新 [ARCHITECTURE.md §6.2](./ARCHITECTURE.md#62-端点清单v10-冻结) 与前端类型定义。

---

## 17. 托管平台部署（Render + Neon 免费层 · 已弃用）

> ⚠️ **状态变更**：Render 在 2026 年起对**免费层（$0/month）也强制要求绑定信用卡**（首笔 $1 临时冻结验证、不扣款）。本项目部署方无可用信用卡，故 Render 路径已弃用。本节配置契约保留作为参考——若后续具备信用卡，仍可沿用。改用方案见 [§18 Vercel + Neon](#18-托管平台部署vercel--neon-免费层)。

本节记录将 `v0.1.0` 部署到公共托管平台的配置契约。平台免费政策可能变动，配置值以平台控制台当期展示为准。

### 17.1 组件分工

| 组件 | 服务 | 说明 |
| --- | --- | --- |
| Web 服务 | Render Web Service（Free） | 单进程 Express，同时托管 API 与前端静态产物 |
| 数据库 | Neon PostgreSQL（Free） | 以外部连接串提供，不使用平台自带免费 Postgres |
| 域名 | 外部域名与 DNS 服务商 | 通过 CNAME 指向平台分配的子域名 |

> Render 免费 Postgres 在创建 30 天后过期并删除数据，不适用于长期部署；Neon Free 为永久免费层，超出月度计算额度时暂停计算但不删除数据。

### 17.2 服务配置契约

| 项 | 值 |
| --- | --- |
| 运行时 | Node.js 22（由 `.nvmrc` 与 `engines.node` 锁定） |
| 构建命令 | `npm ci --include=dev && npm run build` |
| 启动命令 | `npm run migrate:prod && npm start` |
| 健康检查路径 | `/api/health` |
| 实例档位 | Free（须在控制台显式选择，避免误建付费实例） |

**构建命令**：`server/public/` 被 `.gitignore` 排除且不入库，必须在部署阶段现场生成；`vite` 与 `typescript` 位于 `devDependencies`，当 `NODE_ENV=production` 注入时 npm 默认跳过开发依赖，故以 `--include=dev` 强制安装。`npm run build` 依次执行前端构建与后端编译，`scripts/copy-migrations.mjs` 将 `*.sql` 复制进 `server/dist/db/migrations/`，使编译后的迁移执行器可独立运行。

**启动命令**：免费层不提供 Shell 与一次性任务，数据库迁移必须由启动命令触发。`migrate:prod` 执行编译产物 `node dist/db/migrate.js`，不依赖 `tsx`；迁移执行器以 `schema_migrations` 版本号幂等控制，重复执行安全。

### 17.3 环境变量

| 变量 | 来源 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | 控制台固定值 `production` | 仅在运行时需要 |
| `PORT` | 平台注入 | 代码已兼容注入值，无需手工设置 |
| `DATABASE_URL` | Neon 项目连接串 | 完整复制并保留 SSL 参数；**含口令，只在控制台填写** |
| `SESSION_SECRET` | 部署方生成的高熵随机值 | 不入库 |
| `INVITE_CODE` | 部署方设置 | 不入库 |

`server/src/config/env.ts` 以模块位置（向上三级）定位仓库根，不依赖 `.env` 是否存在、也不依赖工作目录；因此 npm workspace 将 cwd 切至包目录时，`PUBLIC_DIR` 与 `UPLOAD_DIR` 仍解析正确。

> 若将 `NODE_ENV=production` 同时注入构建阶段，须配合 `--include=dev`，否则构建会因缺少 vite / tsc 而失败。

### 17.4 免费层限制

| 限制 | 影响 | 处置 |
| --- | --- | --- |
| 空闲约 15 分钟后休眠，冷启动约 1 分钟 | 首次访问延迟 | 接受；外部定时探测属平台策略边缘做法，不保证长期有效 |
| 文件系统为临时卷 | `server/uploads/` 在重启或休眠后丢失 | `M3` 图片上传落地时须接入对象存储（`StorageAdapter` 扩展点），不得写本地盘 |
| 月度计算、存储与出网额度 | 超额后暂停计算 | 监控平台用量面板 |
| 不提供 Shell、持久磁盘与常驻保证 | 无法手工执行迁移或运维 | 迁移由启动命令自动执行 |

### 17.5 自定义域名

1. 先完成部署并验证平台分配的 `*.onrender.com` 地址可访问，再绑定域名。
2. 在服务 `Settings → Custom Domains` 添加域名。
3. 在 DNS 服务商处添加一条 `CNAME`，指向该服务的 `*.onrender.com` 子域名；删除该域名下任何 `AAAA` 记录（平台使用 IPv4）。
4. 回控制台执行 `Verify`；平台自动签发并续期 TLS 证书，HTTP 自动跳转 HTTPS。
5. 免费工作区包含 2 个自定义域名额度，超出部分按平台定价计费。

### 17.6 部署验证记录

以模拟生产环境实测（不提供 `.env`、工作目录切至 `server/`、仅注入环境变量）：

| 项 | 结果 |
| --- | --- |
| `npm run verify`（类型检查 + 构建 + 体积检查） | 通过，74 个源文件在预算内 |
| 编译产物含 `dist/db/migrations/001_roles_users.sql` | 通过 |
| `node dist/db/migrate.js` 在无 `tsx` 环境执行 | 退出码 0，输出「无待应用迁移」 |
| 启动日志 `publicDir` | 指向 `<仓库根>/server/public`（正确） |
| `GET /api/health` | 200，`database: up` |
| `GET /`、静态 JS / CSS、SPA 深层路由 | 均 200 |

---

## 18. 托管平台部署（Vercel + Neon 免费层）

> 适用前提：**无信用卡**。Vercel Hobby 免费层免卡、支持自定义域名、自动 HTTPS，外部数据库使用 Neon Free（见 §17.1 对 Neon 的说明）。替代被绑卡阻断的 Render 方案（§17）。

### 18.1 组件分工

| 组件 | 服务 | 说明 |
| --- | --- | --- |
| 前端静态产物 | Vercel 静态托管（CDN） | `server/public/` 由构建阶段生成，作为 `outputDirectory` 由边缘网络直接分发 |
| 后端 API | Vercel Serverless Functions（Node） | `api/index.ts` 内动态装配 `createApiApp()` 的 Express 实例，仅处理 `/api`；函数运行时版本由 `engines.node` 锁定为 22 |
| 数据库 | Neon PostgreSQL（Free） | 外部连接串，不使用 Vercel 自带存储 |
| 域名 | 外部域名与 DNS 服务商 | 通过 CNAME 指向 Vercel 分配的地址 |

> 与 Render 单进程模型不同：Vercel 下 Express 不再常驻监听，也不再托管静态文件。静态由 CDN 负责，API 由无服务器函数负责，二者通过 `vercel.json` 的 rewrites 分流：`/api/:path*` 显式转发到 `/api` 函数，其余路径回退到 `index.html`（见 §18.12）。代码层面对应：`server/src/api-app.ts` 提供「仅 API」的 Express 装配，`api/index.ts` 为其 serverless 入口；原 `createApp()` 仍保留用于本地与 Render 式单进程。

### 18.2 仓库新增文件

| 文件 | 作用 |
| --- | --- |
| `api/index.ts` | Vercel 函数入口（对应唯一函数路径 `/api`），默认导出 handler；handler 内动态 `import()` 装配 `createApiApp()` 并惰性跑迁移，顶层零运行时依赖（见 §18.10）。多段 `/api/*/*` 由显式 rewrite 送入本函数（见 §18.12） |
| `server/src/api-app.ts` | 仅挂载 `/api` 的 Express 装配（不含静态与 SPA 回退） |
| `vercel.json` | `/api/:path* → /api` 显式转发、SPA 回退重写规则、`functions.includeFiles`（打入 `server/dist/**`）；构建/输出目录在 Vercel 项目设置里显式配置 |

### 18.3 项目配置契约

| 项 | 值 |
| --- | --- |
| Framework Preset | `Other` 或留空（`vercel.json` 已显式声明 `framework: "none"`） |
| Root Directory | 仓库根（`/`） |
| Install Command | `npm ci --include=dev` |
| Build Command | `npm run build`（前端 → `server/public/`；后端 → `server/dist/`） |
| Output Directory | `server/public` |
| Node 版本 | 22（由根 `package.json` 的 `engines.node` 锁定，控制台不需单独设 `NODE_VERSION`） |
| 函数区域 | 建议 `Singapore (sin1)`，贴近 Neon 新加坡实例以降低延迟 |

**构建期注意**：`NODE_ENV` 在 Vercel 生产部署中由平台自动注入为 `production`；当 `NODE_ENV=production` 时 npm 默认跳过 `devDependencies`，故 `installCommand` 须带 `--include=dev`，否则 vite / typescript 缺失导致构建失败（与 §17.2 同一根因）。

### 18.4 环境变量

| 变量 | 来源 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | Neon 项目连接串（pooled） | 完整复制并保留 `?sslmode=require`；**含口令，只在 Vercel 控制台填写，不入库、不聊天** |
| `SESSION_SECRET` | 高熵随机值 | 不入库 |
| `INVITE_CODE` | 部署方设置 | 不入库 |
| `NODE_ENV` | 平台自动注入 `production` | 通常无需手工设置 |

> `NODE_VERSION` 在 Vercel 不需要：函数运行时由 `engines.node` 决定。`PORT` 不适用（函数模型无监听端口）。

### 18.5 自定义域名（starpal.cc.cd）

1. 先完成部署、验证 Vercel 分配的 `*.vercel.app` 地址可访问，再绑域名。
2. 项目 `Settings → Domains` 添加 `starpal.cc.cd`。
3. 在 DNSHE 控制台添加一条 `CNAME`：主机名 `starpal.cc.cd`（或子域 `@`），指向 Vercel 给出的目标地址（形如 `cname.vercel-dns.com`，以控制台展示为准）。
4. Vercel 自动签发并续期 TLS 证书；返回后确认 `Verify` 通过、HTTP 自动跳 HTTPS。
5. Hobby 免费层包含自定义域名额度，不额外计费。

### 18.6 数据库迁移

`api/index.ts` 在**函数冷启动、首个请求前**惰性调用 `runMigrations()`（幂等，靠 `schema_migrations` 账本去重），因此**构建期不依赖数据库**，迁移在运行时首次访问时自动建表。本仓库已对真实 Neon 执行过迁移，表 `roles` / `users` / `schema_migrations` 已存在。

> 关键坑：`migrate.ts` 运行时用 `readdirSync` + `readFileSync` 读取 `server/dist/db/migrations/*.sql`，Vercel 的 nft 文件追踪**不会**自动包含这种动态读取的文件，会导致函数包漏掉 SQL、运行时报 ENOENT。已在 `vercel.json` 用
> `functions["api/index.ts"].includeFiles: "server/dist/**"` 将整个编译产物目录显式打入（函数以动态 `import()` 引用 `server/dist` 下的模块，nft 同样不会自动追踪），验证通过。

> 迁移目录定位：`migrate.ts` 不再写死 `import.meta.url` 的相邻目录。函数被打包后 `import.meta.url` 指向打包产物而非原模块，迁移 SQL 会读不到。现按多候选路径探测（模块相邻目录 → `process.cwd()/server/dist/db/migrations` → `process.cwd()/dist/db/migrations`），返回第一个真实存在的目录，兼容本地单进程与 Vercel lambda（lambda 内 `cwd=/var/task`，迁移位于 `/var/task/server/dist/db/migrations`）。

> 另一关键坑：项目级 `buildCommand` / `installCommand` / `outputDirectory` 必须**显式在 Vercel 项目设置里填写**（不能只靠 `vercel.json` 的 `framework: "none"` 那套）。若这些字段在 Vercel 项目里是 `null`，构建会变成 0ms 空构建 → 部署 `ERROR`。当前三项已在项目设置显式写入。

后续新增表结构只通过新增迁移文件并推送 `main`；冷启动会自动应用，无需手动跑。

### 18.7 免费层限制与处置

| 限制 | 影响 | 处置 |
| --- | --- | --- |
| 函数按请求冷启动 | 首次 / 久置后访问延迟 | 接受；Hobby 不休眠，远优于 Render 休眠模型 |
| 文件系统临时 | 函数实例间不共享本地盘、重启清空 | `M3` 图片上传须接入对象存储（`StorageAdapter`），不得写本地盘 |
| 月度函数调用 / 计算额度 | 超额后限流 | 监控 Vercel Usage 面板；Hobby 额度对个人站点充裕 |
| 单函数包体与执行时长上限 | 超大依赖或长任务受限 | 拆分逻辑；重任务异步化 |

### 18.8 部署验证记录

本地以 Vercel 同款命令与产物结构实测：

| 项 | 结果 |
| --- | --- |
| `npm run build` | 通过；`server/public/index.html` 与 `assets/` 产出，服务端 `tsc` 零报错 |
| `esbuild` 打包当时的函数入口（早期 catch-all，ESM）本地执行 + 真实 Neon | 通过；`GET /api/health` 200、`GET /api/nope` 404 结构化包络 |
| **线上** `GET https://starpal.cc.cd/api/health` | **200**，`{"data":{"status":"ok","database":"up",...}}` |
| **线上** `GET https://starpal.cc.cd/api/nope` | **404** 结构化错误包络 |
| **线上** `GET https://starpal.cc.cd/` | **200** |
| 静态 `index.html` / assets、SPA 深层路由 | 均 200（由 CDN + rewrites 提供） |
| **线上** 多段 `/api/*/*`（路由修复后） | 由 Express 正常返回 200 / 401 / 404，账户闭环 12 项全通过（见 §18.12） |

### 18.10 Serverless 函数入口的四条硬约束（踩坑记录）

首次上线后 `/api/*` 持续报 `FUNCTION_INVOCATION_FAILED`，最终用一个「顶层零依赖」的诊断函数打到线上、把运行时环境打印出来才定位清楚（Node v22 / ESM / `cwd=/var/task` / `server/dist` 可见 / 动态 `import()` 可用）。据此固化的四条约束：

1. **入口与转发必须成对**：函数入口收敛为 `api/index.ts`（只对应 `/api`），并在 `vercel.json` 加 `/api/:path* → /api` 显式转发，由平台把任意层级的 API 请求送入函数。**不要**只依赖 `api/[...slug].ts` 的 catch-all 命名：实测多段 `/api/*/*` 仍会被平台文件系统判定拦截并返回原生 404（详见 §18.12）。
2. **顶层零运行时依赖**：函数文件顶层不得有任何 `import`（`import type` 除外）、不得依赖 `import.meta.url`、不得调用 `createRequire` 之类的打包垫片。Vercel 以 nft 保留原生模块、无需垫片；任何顶层抛错都会被平台渲染成黑盒 `FUNCTION_INVOCATION_FAILED`，且绕过 `try/catch`。Express 及其 CJS 依赖由平台原生提供。所有工作放进 handler 内的动态 `import()` 并整体包进 `try/catch`，失败时返回结构化 500（含 stack）而非黑盒错误。
3. **rewrite 正则要排除裸 `/api`，且顺序不能反**：用 `/((?!api).*)`，不要用 `/((?!api/).*)`（后者只排除 `api/`，裸 `/api` 会被当成普通路径重写到 `index.html`）。更具体的 `/api/:path*` 必须排在 SPA 回退之前，rewrites 按序匹配。
4. **编译产物路径**：函数引用的是 `server/dist/**`（编译后 JS），不是 `server/src/**`（源码 `.ts`）。`server/src/foo.js` 在磁盘上不存在，静态 import 会直接让函数加载失败。

> 本地用 esbuild 复现时曾遇到 `Dynamic require of "tty" is not supported`（ESM 输出下 Express 依赖链的 CJS 动态 `require`），一度误判为线上根因并加了 `createRequire` 垫片——**该问题只属于本地单文件打包，Vercel nft 模式不存在**。诊断证明移除垫片、顶层零依赖后线上立即恢复。

### 18.9 实际部署实例信息（Vercel）

本仓库在 Vercel 上的真实配置（供对照与排障）：

| 项 | 值 |
| --- | --- |
| 项目名 | `starpal` |
| 项目 ID | `prj_q2qC2UnY2xHvfC8Zsj47dhaBoiaM` |
| 所属团队 | `team_QE8gosnNcsAnwgIhsMPNR365`（`xiaoyu-hue's projects`） |
| Git 连接 | GitHub `xiaoyu-hue/starpal`，生产分支 `main`，`createDeployments=enabled` |
| 生产域名 | `https://starpal.vercel.app` |
| 运行时 | Node `22.x` |
| 函数区域 | `sin1`（新加坡，贴近 Neon `ap-southeast-1`） |
| 构建 | `installCommand=npm ci --include=dev`、`buildCommand=npm run build`、`outputDirectory=server/public`（**三项均在 Vercel 项目设置显式写入**，非仅靠 vercel.json） |
| 函数入口 | `api/index.ts`（对应 `/api`；顶层零运行时依赖 + handler 内动态 `import()` + 全量 `try/catch`） |
| 函数打包 | `vercel.json` 的 `functions["api/index.ts"].includeFiles: "server/dist/**"` 将整个编译产物打入函数包 |
| API 转发 | `rewrites: /api/:path* → /api`（置于 SPA 回退之前，覆盖任意层级 `/api/*/*`，见 §18.12） |
| SPA 回退 | `rewrites: /((?!api).*) → /index.html`（排除裸 `/api`） |
| 环境变量 | `DATABASE_URL` / `SESSION_SECRET` / `INVITE_CODE`（均加密，仅平台可见；修改后需重新部署才能生效） |
| 自定义域名 | `starpal.cc.cd` 已在 Vercel 登记；DNSHE 需加 CNAME：`starpal` → `cname.vercel-dns.com` |
| 部署触发 | 推送 `main` 自动构建（GitHub → Vercel webhook） |

> 注：本项目通过 Serverless Function（`api/index.ts`，冷启动惰性迁移）承载 `/api`，由 `vercel.json` 的 `/api/:path* → /api` 显式转发把任意层级 API 请求送入函数；静态资源由 `server/public` 经 CDN 与 `/((?!api).*) → /index.html` 提供。函数入口的四条硬约束见 §18.10，多段路径故障与修复见 §18.12。

> 自定义域名状态：`starpal.cc.cd` 已在 Vercel 登记并完成 DNS 验证（`verified=true`、`configVerifiedAt`/`nsVerifiedAt` 均非空、`cdnEnabled=true`）。DNSHE 侧已添加 CNAME 记录，线上 `https://starpal.cc.cd/` 与单段 `/api/*` 实测通过；多段 `/api/*/*` 曾返回平台原生 404，修复与复测见 §18.12。

### 18.11 M2 账户闭环部署契约

`M2-S1`（数据基座）与 `M2-S2`（注册 / 登录 / 登出 / 当前会话）落地后的部署要点：

| 项 | 说明 |
| --- | --- |
| 新增依赖 | `hash-wasm@4.13.0`（纯 WebAssembly 的 Argon2id），**零原生编译模块**。`npm ci --include=dev` 已复验通过。 |
| 为何不用 argon2 / bcrypt 原生模块 | Vercel 官方知识库明确说明需 `node-gyp` 编译的原生依赖在函数环境不保证可用；本项目 M1 阶段已因打包差异多次踩坑，故改用 WASM 实现，兼顾 OWASP 首选算法与部署稳定性。 |
| 密码哈希参数 | Argon2id，64 MiB / 3 轮 / 并行度 1，PHC 编码串自带参数，日后提高强度无需洗库（下次登录按需重哈希）。 |
| 新增表 | `002_profiles_sessions.sql` 建立 `user_profiles`、`sessions`、`security_events` 及四个索引；由函数冷启动惰性迁移幂等应用，账本至 `002`。 |
| 会话Cookie | `starpal_session`，`HttpOnly` + `SameSite=Lax` + `Max-Age=SESSION_TTL_HOURS`；`Secure` 由 `x-forwarded-proto` 判定（Vercel 边缘终止 TLS，`req.secure` 不可靠，见 §18.10）。 |
| 限流存储 | `security_events` 表，绝不使用进程内存计数——Serverless 多实例下内存计数各自为政。来源以 `HMAC-SHA256(SESSION_SECRET, IP+UA)` 不可逆摘要标识，不保留原始地址。 |
| 环境变量 | 复用既有 `INVITE_CODE`、`SESSION_SECRET`、`SESSION_TTL_HOURS`、`RATE_LIMIT_*`、`LOGIN_FAIL_MAX`、`SECURITY_EVENT_RETENTION_DAYS`；**无新增变量**，代码不硬编码任何凭据。 |
| 锁文件 | `package-lock.json` 全部依赖地址统一为 `https://registry.npmjs.org/`（官方 HTTPS），避免依赖构建环境专用明文镜像。 |

本地验证记录（真实 Neon，非模拟）：

| 场景 | 结果 |
| --- | --- |
| 未登录 `GET /api/auth/me` | 401 `AUTH_REQUIRED` |
| 合法注册 | 200，返回公开投影；DB 中 `password_hash` 为 `$argon2id$` 前缀，无明文（`AC-01` / `AC-03`） |
| 错误邀请码 / 重复用户名 | 400 `INVITE_INVALID` / 409 `CONFLICT` |
| 错误密码登录 | 401 `INVALID_CREDENTIALS`（与账户不存在同提示） |
| 正确登录 | 200，`Set-Cookie` 属性正确 |
| 携 Cookie 访问 `/me` | 200 |
| 登出 → 同 Cookie 再访问 `/me` | 401（`AC-02`） |
| `GET /api/health` | 200，`database: up` |

> 测试数据已在验证后从生产库清理（`users` 归零、安全事件清空），未污染真实数据。
> **线上复测（多段路由修复后，部署 `dpl_HmGizJetRKGUhoxCJonrJ7N5tR8a`）**：同一套 12 项场景在 `https://starpal.cc.cd` 全部通过——未登录 `/me`、错误邀请码、合法注册、重复用户名、蜜罐、错误密码、正确登录 + `Set-Cookie`、携 Cookie `/me`、登出、登出后 `/me`、健康检查、库中 `$argon2id$` 前缀。测试账号与本次安全事件按验证起始时间窗精确清理，生产库 `users` / `sessions` 归零，迁移账本仍为 `001` / `002`。
> `AC-01`、`AC-02`、`AC-03` 已有本地与线上验证记录；`AC-10`、`AC-18` 属 `M2-S3`—`S5`，尚未验证。

### 18.12 多段 API 路径的平台 404（路由修复）

`M2` 上线后复测发现：`/api/health`、`/api/posts`、`/api/nope` 正常（单段），但 `/api/auth/me`、`/api/auth/login`、`/api/meta/guidelines` 返回 Vercel 平台原生 `The page could not be found / NOT_FOUND`——**不是**业务层的结构化 404，说明请求根本没进 Express。这是 `M1` 部署阶段就埋下、当时只测单段路径未暴露的问题，与 `M2` 业务代码无关。

**根因**：Vercel 路由判定中「文件系统优先于 rewrites」（官方文档原文：`The source property should NOT be a file because precedence is given to the filesystem prior to rewrites being applied.`）。`api/[...slug].ts` 生成的函数路由没有覆盖多段 `/api/*/*`，这类请求在文件系统阶段既找不到静态文件、也匹配不到函数；而 SPA 回退 `/((?!api).*)` 因负向前瞻排除了所有 `api` 开头的路径，也不会接管；于是平台直接返回原生 404。

**修复**：把函数入口收敛为 `api/index.ts`（对应唯一函数路径 `/api`），并在 `vercel.json` 增加一条更具体的显式转发，放在 SPA 回退之前：

```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api" },
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/index.ts": { "includeFiles": "server/dist/**" }
  }
}
```

`:path*` 是官方支持的通配写法（官方文档 `/proxy/:match*` 示例，覆盖任意子目录）。转发是平台内部路由映射，函数仍收到原始请求路径，Express 按完整路径匹配路由。

**一次可判定实验**：部署后用 4 个路径一次定性，两种结果互不混淆——

| 路径 | 若保留原始路径（预期） | 若被改写成 `/api` |
| --- | --- | --- |
| `GET /api/health` | 200 `database: up` | 业务层 404 包络 |
| `GET /api/auth/me` | 401 `AUTH_REQUIRED` | 业务层 404 包络 |
| `GET /api/meta/guidelines` | 200 指南数据 | 业务层 404 包络 |
| `GET /api/posts` | 400 `VALIDATION_FAILED` 或 200 空页 | 业务层 404 包络 |

若出现右列结果，说明转发把 `req.url` 改成了 `/api`，回滚方式：恢复 `api/[...slug].ts` 与旧 `vercel.json` 重新推送（只改两个文件，不涉及数据库，可逆）。

**已知边界**：SPA 回退 `/((?!api).*)` 会把 `/apiary`、`/apis` 这类以 `api` 开头但并非 API 的路径也排除在回退之外，返回 404。本项目前端无此类路由，暂不处理；若将来新增，应把正则收紧为 `/((?!api(?:/|$)).*)`。

**线上复测结果**（部署 `dpl_HmGizJetRKGUhoxCJonrJ7N5tR8a`，提交 `9573dca059aa`）：

| 路径 | 实测 |
| --- | --- |
| `GET https://starpal.cc.cd/` | 200，前端 HTML |
| `GET /api/health` | 200，`database: up` |
| `GET /api/auth/me` | 401 `AUTH_REQUIRED`（业务层，非平台 404） |
| `GET /api/meta/guidelines` | 200，社区准则数据 |
| `GET /api/posts` | 400 `VALIDATION_FAILED` |
| `GET /api/nope` | 404 结构化错误包络（`NOT_FOUND`，业务层） |

结论：转发**保留了原始请求路径**，Express 按完整路径匹配，修复成立。账户闭环线上 12 项端到端验证全部通过（见 §18.11）；测试账号与本次安全事件已按时间窗精确清理，生产库 `users` 归零、`sessions` 归零、迁移账本仍为 `001` / `002`。

### 18.13 前端认证域（M2-S2-T6）

`/login`、`/register` 由占位页替换为真实页面，实施计划中 `M2-S2` 的最后一项任务落地。

| 项 | 说明 |
| --- | --- |
| 新增文件 | `web/src/features/auth/`：`api.ts`（四接口封装）、`AuthProvider.tsx`（当前会话三态）、`AuthForm.tsx`（登录 / 注册共用表单）、`AuthPage.tsx`、`index.ts` |
| 传输层 | `web/src/lib/api-client.ts` 新增 `apiPost()`，GET / POST 共用同一套响应解包与错误归一化；无请求体的 POST 不带 `Content-Type`，与后端 `body-limit` 修复对齐 |
| 会话状态 | `AuthProvider` 首屏请求 `GET /api/auth/me` 决定顶栏呈现（加载中 / 已登录 / 未登录）；登录、登出后直接更新，权限判定仍以后端为准 |
| 表单可访问性 | `label htmlFor` + `id`、`required` / `aria-required`、`aria-invalid` / `aria-describedby`、错误区 `role="alert"`、成功提示 `role="status"`（polite）；修改输入时立即清除错误态；`autocomplete` 区分 `username` / `current-password` 与 `new-password` |
| 蜜罐 | `website` 字段移出视野 + `aria-hidden` + `tabIndex=-1`，读屏与键盘不可达；命中后服务端返回形状一致的假用户 |
| 注册流程 | 服务端注册不发放会话凭证，成功后跳 `/login` 并带 `role="status"` 提示，需显式登录一次（取舍：避免隐式登录；如改为「注册即登录」须另加一轮） |
| 凭据 | 前端不硬编码邀请码、密钥或口令；邀请码由用户输入，仅经 HTTPS 提交 |
| 本地校验 | `npm run verify`（类型检查、前后端构建、文件体积）通过；认证页面生成独立分包 `AuthPage-*.js` |

**线上验证结果**（部署 `dpl_FmgJR5Bxhpt7JJeFGybDD4Uv6XVD`，提交 `d082b8802699`）：真实 Chromium 在 `https://starpal.cc.cd` 执行 15 项检查全部通过——注册页渲染、四个语义标签、`autocomplete` 区分、蜜罐对读屏 / 键盘隐藏、空表单本地校验、修改输入即清除错误态、错误邀请码提示、注册后跳登录页、`role="status"` 成功提示、登录页 `autocomplete`、错误密码统一提示、登录后顶栏切换、退出后恢复访客入口、刷新后仍为未登录、无未捕获脚本错误；浅色注册页 / 深色登录页 / 390px 移动端截图核验无错位与横向溢出。测试账号与本次安全事件按时间窗精确清理，生产库 `users` / `sessions` 归零、账本仍为 `001` / `002`。逐项记录见 `IMPLEMENTATION-PLAN.md` 的「M2 验证记录」。

> 已知体验边界：移动端顶栏仅显示「注册」（「登录」按钮沿用既有的小屏隐藏规则），手机用户需经注册页的「去登录」链接进入登录页；可在后续迭代补一个移动端登录入口。


### 18.14 受保护路由与角色基座（M2-S3）

对应 `M2-S3-T1`—`T4`。这一阶段不新增业务功能，只建立**服务端强制门禁**与初始管理员创建能力。

**代码契约**

| 项 | 说明 |
| --- | --- |
| `require-auth.ts` | 路由级认证守卫：`readSessionId` → `currentUser` → 把 `AuthPrincipal`（id / username / displayName / role）挂到 `req.principal`；失败由集中错误处理输出 `401 AUTH_REQUIRED` |
| `require-role.ts` | 工厂函数 `requireRole(...allowed)`；未先挂 `requireAuth` 时**直接拒绝**而非静默放行，避免「忘了挂守卫」被误当成「允许匿名」；角色不符输出 `403 FORBIDDEN` |
| 每请求查库 | 守卫每次重新读 `sessions` 与 `users`，账户停用 / 删除 / 角色变更后立即生效，不缓存主体；本地实测同一 Cookie 在角色提升后下一次请求即返回 200 |
| `modules/admin/` | `adminRouter` 一次性 `use(requireAuth, requireRole(ROLE_ADMIN))`；当前仅 `GET /api/admin/whoami` 回显调用者自身身份，作为 `AC-11` 前置验证锚点与 `M6` 后台的挂载骨架。此后新增管理端点自动受保护，不会漏挂 |
| 错误码与依赖 | 复用既有 `AUTH_REQUIRED` / `FORBIDDEN`；未新增表、未新增依赖、未新增错误码 |
| 前端守卫 | `web/src/app/guards.tsx` 的 `RequireAuth` 仅做体验层跳转：`/settings` 未登录跳 `/login` 并带 `notice` + `from`，登录成功后回跳；`safeReturnTo` 只接受站内绝对路径，阻断 `//host`、反斜杠与协议注入造成的开放重定向。权限判定仍以后端为准 |
| 分包保护 | 守卫放在 `app/` 并从 `AuthProvider` 具体文件导入，避免静态引入 `features/auth/index.ts` 把已懒加载的 `AuthPage` 打进主包；构建产物仍生成 `AuthPage-*.js` 独立分包 |

**初始管理员脚本（T3）**：`scripts/init-admin.mjs`，根命令 `npm run init:admin`。

| 行为 | 说明 |
| --- | --- |
| 凭据来源 | 只读环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` / 可选 `ADMIN_DISPLAY_NAME`；`DATABASE_URL` 复用现有配置；`.env.example` 仅保留变量名占位 |
| 哈希 | 复用 `server/dist/modules/auth/password.js` 的 `hashPassword` 与 `config/constants.js` 的准入常量，不重复实现 Argon2id 参数；脚本检测编译产物缺失或过期并提示先 `npm run build` |
| 幂等 | 同名账号已存在时**不改密码、不改角色、不提权**，直接退出，避免误伤已有账号 |
| `--reset` | 仅显式传参时才重置密码，并同时 `DELETE FROM sessions WHERE user_id = ...` 撤销该账号全部会话；不改角色 |
| 输出 | 只打印用户名与结果；不打印密码、哈希或堆栈（错误路径也只打印消息文本） |
| 事务 | 表存在性检查、写入 `users` + `user_profiles` 在同一事务内；失败回滚 |

**手把手：创建你自己的管理员**（凭据不经过对话、不入仓库）

> 前提：本机已装 Node.js 22（项目 `engines.node` 要求），并持有 Neon 的连接串。以下步骤在你自己的电脑上完成，**不要把密码发到聊天窗口**。

1. 在项目根目录新建文件 `.env.local`。它已被 `.gitignore` 第 3 行 `.env.*` 排除，不会被提交。
2. 在文件里写三行（`DATABASE_URL` 换成你的 Neon 连接串，另两项自己设定）：

   ```
   DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
   ADMIN_USERNAME=<你的管理员用户名>
   ADMIN_PASSWORD=<至少12位的高熵密码>
   ```

   `<...>` 是占位说明，请替换成你自己的值，**尖括号本身不要保留**。

3. 执行下面这条命令。密码留在文件里，**不要**写成 `ADMIN_PASSWORD=xxx npm run init:admin`——那样会留在 shell 历史与进程列表里：

   ```bash
   node --env-file=.env.local scripts/init-admin.mjs
   ```

4. 看到 `[init:admin] 已创建管理员 ...` 即完成。之后把 `.env.local` 存进密码管理器或删除；**仓库里始终没有明文凭据**。
5. 重复执行一次会看到「账号已存在，未做任何修改」，不会把账号改坏。

> 如果你不想自己敲命令，也可以让我代跑，但那样需要把密码发到对话里。**我不推荐**：管理员是最高权限账号，凭据一旦出现在聊天记录或日志里很难彻底收回。更稳妥的是你按上面 5 步自己做，我只负责把脚本与文档准备好。

**唯一管理员的风险与恢复办法**：项目不收集邮箱 / 手机，也没有第二个管理员，因此忘记密码后没有任何自助找回途径。若确需重置，用同一环境文件执行：

```bash
node --env-file=.env.local scripts/init-admin.mjs --reset
```

这会重置密码并让该账号的全部现有会话立即失效（旧 Cookie 不再具备管理员权限）。`--reset` 是破坏性操作，**默认关闭**；脚本不会打印新旧密码。

**已知边界与缺陷（如实登记）**

- `/api/admin/whoami` 是验证锚点，不是 `M6` 的业务功能；它只回显调用者自身身份，不查询任何业务数据。前端目前没有管理页面，因此**没有前端角色守卫组件**——服务端角色守卫已就位，`M6` 有真实管理页时再补体验层守卫。
- 前端守卫目前只挂了 `/settings` 一个占位页（语义上属于「我的设置」）。从守卫跳到登录页后若先点「去注册」，`from` 会丢失，注册后再登录会回首页而非原目标；属体验边界，未处理。
- 已登录但首屏会话读取尚未结束时，守卫先显示骨架屏而不是立刻跳走，避免把已登录用户误判成访客。
- 本地运行 `pg@8.23.1` 会出现 `SECURITY WARNING: The SSL modes 'prefer', 'require' ...` 警告；这是驱动对未来版本语义变更的提示，不是错误，线上行为不受影响。
- **工作区残留风险**：`AC-18` 按「远程 `main` 仓库快照」口径扫描通过（见下），但本地工作区的 `.env` 仍含数据库连接串、会话密钥与邀请码明文。它已被 `.gitignore` 排除且未入仓，属本机文件；建议存进密码管理器后删除，或至少不要随项目目录一起分享。**未擅自删除，需部署方明确同意**。`/tmp/starpal-*` 若干临时凭证文件同理，安全收尾时一并处理。

**验证记录**：本地 `npm run verify` 通过（类型检查、前后端构建、94 个源文件体积预算）；初始管理员脚本在真实 Neon 上 12/12 通过；本地 HTTP 服务守卫 9/9 通过。**线上正式域名 20/20 通过**（部署 `dpl_BHj22nX47agTLPYrR8c9jcvv2hyd`，提交 `8eb5042aab47`）：首页、`/api/health`、`/api/auth/me`、`/api/meta/guidelines` 无回归；访客 401、普通用户 403、客户端声明 `role=admin` 仍 403、角色提升后同一 Cookie 即时 200、降回即 403、探针不泄露内部字段；真实 Chromium 验证未登录访问 `/settings` 跳登录页并显示提示、登录后回跳 `/settings`、伪造前端 admin 状态后管理端点仍 403、顶栏已登录态、无未捕获脚本错误。所有临时账号与本次安全事件按时间窗精确清理，生产库 `users=0`、`sessions=0`、账本仍为 `001` / `002`。逐项记录见 `IMPLEMENTATION-PLAN.md` 的 M2 验证记录。

**AC-18 扫描**（命令 `python3 /tmp/m2s3_ac18_scan.py`；脚本位于会话沙箱、未入仓，口径与模式见下，可据同等逻辑固化为仓库检查脚本，登记为欠账）：以 GitHub `zipball/main` 下载**远程真实仓库快照**扫描，不依赖本地 git 索引（本仓库长期通过 Git Data API 推送，本地索引曾滞后到只扫出 8 个文件，据此得出的结论不可靠，已纠正）。

| 轮次 | 远程快照文本文件 | 命中 | 说明 |
| --- | --- | --- | --- |
| 推送前基线 | 118 | 0 | 旧仓库 |
| 推送后首次复扫 | 124 | 1 | 教程示例 `ADMIN_PASSWORD=至少12位的高熵密码`（中文示例值）被「真实赋值」正则误判；非真实凭据，已改为 `<...>` 占位符并在上文说明 |
| 最终复扫（提交 `7c7e241b4285` 后） | 124 | 0 | 仓库无令牌 / 口令 / 连接串 / 邀请码 / 私钥明文，**`AC-18` 通过** |

**最终结论**：`AC-18` 通过。命令 `python3 /tmp/m2s3_ac18_scan.py` 在提交 `7c7e241b4285` 后对远程 `main` 快照实际执行，口径 A 扫描 124 个文本文件 / 8 类模式，命中 0 处（输出：两口径分别为 124 / 0 命中与本地 3 处 `.env` 命中）。

> 8 类模式：Vercel Token、GitHub Token、私钥、含口令的 PostgreSQL 连接串、邀请码明文、`SESSION_SECRET` / `ADMIN_PASSWORD` / `INVITE_CODE` 真实赋值。`<...>` 占位符与纯变量名不计入。本地工作区口径命中 3 处，全部来自被 `.gitignore` 排除且未入仓的 `.env`，单独登记为工作区残留风险，不计入仓库结论。
