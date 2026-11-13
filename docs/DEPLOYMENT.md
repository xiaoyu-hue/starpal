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

## 17. 托管平台部署（Render + Neon 免费层）

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
