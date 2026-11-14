# 变更记录

本文件记录项目的重要变更，格式遵循 [Keep a Changelog](https://keepachangelog.com/)。版本号遵循语义化版本约定。所有条目使用过去时态描述已发生的变更；计划中的工作只在 `[Unreleased]` 中列出，不计为已交付。

## [Unreleased]

### 新增（站内许可与源码入口）

- 「关于」页新增「许可与源码」区块（`server/src/config/docs/about.doc.ts`）：按分离式授权写清源代码 AGPL-3.0-or-later、文档与文字 CC BY-NC-SA 4.0、名称与标识商标保留三类适用范围，并给出源码仓库地址与 AGPL-3.0 第 13 条的源码索取途径；`/api/meta/about` 响应与 `MetaAbout` 类型同步扩展，前端 `AboutPage.tsx` 渲染。
- 新增站点页脚 `web/src/app/shell/SiteFooter.tsx`：说明页入口 + 「源码」外链 + 许可标注。「源码」地址取自 `/api/meta/about` 的 `licensing.sourceUrl`，与「关于」页同源（README 部署章节此前承诺该链接真实可用）；外链带 `noopener noreferrer`，取不到数据时只省略外链、不影响其余链接。
- `AppShell.tsx` 挂载页脚，并把主区底部留白交给页脚承担，避免移动端底部 Tab 遮挡链接。

### 变更（仓库公开与源码可达）

- GitHub 仓库 `xiaoyu-hue/starpal` 由私有转为公开：源代码、许可全文、第三方声明、提交与发布记录对所有人可见。AGPL-3.0 第 13 条的网络义务自此闭环，站内「关于」页与页脚的「源码」链接真实可达，此前「链接暂不可访问时留言索取」的兜底继续保留。
- 仓库 `homepage` 登记为 `https://starpal.cc.cd`；README 的「当前访问地址」仍是站点地址的唯一对外口径，域名与品牌不混用。
- 社区公告新增一条，向成员说明仓库公开后哪些内容可见、哪些不变（仍为邀请制、用户数据不公开、注册仍需专属邀请码）。
- `main` 由 Vercel 的 Git 集成自动构建部署（`createDeployments=enabled`），本次推送即触发生产发布，无需单独的部署凭据。

### 更正（关于页文案与代码漂移）

- `about.doc.ts` 自述原写「通知中心仍在路上、帖子暂时不能自己删除、没有自助改密」，与公告 `status` 真源及实际代码不符；改为与公告一致的四项未完成能力（私信、搜索、收藏列表界面、举报与申诉入口），并补列已交付的通知中心、一人一码邀请制、自助改密、自行删除帖子。
- 致谢段把依赖许可由「主要为 MIT 与 ISC」更正为「主要为 MIT、ISC、Apache-2.0 等」，与 `THIRD-PARTY-NOTICES.md` 口径一致。
- `README.md` 的 AGPL 网络义务说明改为不依赖仓库可见性的表述，写明站内两处获取途径与共用同一地址的机制。

### 更正（公开后暴露的文档欠账）

- `docs/DEPLOYMENT.md`：§3 示例与 §4 环境变量表移除已下线的 `INVITE_CODE`；示例与 `.env.example` 对齐并补 `ADMIN_DISPLAY_NAME`（初始化脚本实际读取）；§3 后的启动校验说明改为 `env.ts` 的真实 `REQUIRED` 口径；§15 检查表、§18.9 现行环境变量同步。§18 开头新增「历史记录时效说明」，明确各阶段验证记录里出现的 `INVITE_CODE` 属当时口径、现行配置以 §3 / §4 与 `.env.example` 为准——历史原文不改写。
- `docs/DEPLOYMENT.md` §18.9：仓库公开后不再写入 Vercel 项目 ID / 团队 ID 等实例标识，改为「以控制台为准」的占位表述；其余排障配置保留（非密钥，仅缩小被定向探测范围）。
- `docs/IMPLEMENTATION-PLAN.md`：M5 / M6 预设迁移文件名编号（`005`–`008`）与现有 `001`–`009` 冲突，改为 `NNN_` 占位前缀并新增统一说明——新迁移按目录下一个可用序号编排（现为 `010` 起）；§7 交付物清单的迁移范围由 `001…008` 更正为 `001…009`。
- `docs/DOC_SYNC.md`：易漂移点补入「迁移编号以目录实际占用为准」。

### 测试

- 新增 `server/tests/unit/about-doc.test.ts`（5 项）：三类许可齐全、源码途径存在、许可文案不写死仓库公开状态、未完成清单与公告真源一致、已交付能力不再写成未完成。测试数 57 → 62。
- `npm run verify` 全绿（typecheck / build / check:size / lint / test），`lint` 0 违规、行数预算内。

## [1.2.0] - 2026-11-14

`M4` 互动域收尾版本。通知中心、一人一码邀请制、自助改密，以及协作规则、文档同步规范、商标与许可合规在本版本集中交付；`M4` 六个子阶段 `24/24` 子任务、验证记录 `VR-M4-01`—`VR-M4-10` 全部通过（含真实 PostgreSQL 端到端与 390px 浏览器实机验证），`npm run verify` 全绿。本版本首次打 git 标签并发布 GitHub Release。

### 新增（README 按社区标准重构重写）

- 按业内开源社区 README 惯例重构：项目定位与三分定义（品牌 / 运营者 / 域名）、目录锚点、使用者与开发者双视角、功能概览、状态与路线图、快速开始、环境变量、脚本契约、项目结构、API 概览、质量门、部署、安全与隐私、文档索引、版本发布、许可、贡献、反馈渠道。
- 新增「致谢与依赖」章节：向设计思路所参考的社区产品与全部上游依赖维护者致意，并列出直接依赖分类与许可证兼容性说明（完整清单仍以 `THIRD-PARTY-NOTICES.md` 与 lockfile 为准）。
- **更正长期与代码不符的表述**：原「特性」章把搜索、每周热门、成就时间线、留言式私信、举报与治理后台、独立审核日志、一键内容导出、shadcn/ui 等**未实现**能力写成已有；技术栈把未引入的组件列为已用。本次全部按真实代码重写，「已实现但无界面」（如收藏列表）如实标注为缺口。
- 「当前实现状态」由 `M4-S2` 时期（还写着「通知中心待交付」）更新为 `M1`—`M4` 已交付、`M5`—`M7` 未开始，并写明与站内公告一致的四项未完成能力。

### 变更（版本与发版口径校准）

- 版本号由 `1.1.0` bump 至 `1.2.0`：根 / `web` / `server` 三个 `package.json`、`server/src/config/constants.ts` 的 `APP_VERSION`、`package-lock.json`（顶层、`packages[""]`、两个 workspace 共四处）；lockfile 中第三方包自身的 `1.1.0` 未改动。`lint` 的 `R4` 保证四处同源。
- 修正 `AGENTS.md` 与 `docs/DOC_SYNC.md` 中「当前 `1.1.0` 但尚未正式发版」「`M4` 收尾前不单独发版」等**过时口径**：`1.1.0` 早已正式发布，`1.2.0` 为 `M4` 收尾版本；发版仍是需作者拍板的「先问」类决策，日常变更继续在 `[Unreleased]` 累积。
- 修正 `server/src/config/docs/announcements.doc.ts` 头部注释中「当前版本停留在 1.1.0，收尾统一发版时再补」的过时说明：公告按既定政策始终不含版本号，版本信息以本文件与 Release 为准。
- 修正 `docs/IMPLEMENTATION-PLAN.md` 中 `M4` 进度句（由「仅剩统一发版」改为已随 `v1.2.0` 发布），以及 `M4-S2-T2` 把**并不存在**的「收藏列表 `GET /api/me/bookmarks`」写成已交付的超前表述——代码仅提供收藏开关与计数，独立列表页属未完成项。

### 新增（自助改密）

- 新增 `POST /api/auth/change-password`：登录后凭当前密码设置新密码，`requireAuth` 守卫；新密码复用注册的 `PASSWORD_MIN/MAX`（12–128）与 Argon2id 参数。
- 改密在同一事务内完成「更新口令哈希 + 撤销该用户除当前会话外的全部会话」：其它设备强制重新登录，当前设备不掉线。
- 新增独立失败限流 `password_change_fail`（与登录失败同阈值但独立计数），新增 `password_change_ok` 事件留痕；`SECURITY_EVENT_KINDS` 与架构文档同步。
- 前端设置页新增「修改密码」分区（`web/src/features/profile/PasswordSection.tsx`）：当前 / 新 / 确认三次输入、即时校验、成功后提示其它设备需重新登录。
- 密码长度常量抽到 `web/src/config/auth-constants.ts`，注册表单与改密表单共用，消除数字重复。
- 新增测试 `server/tests/integration/password-change.test.ts`（6 项）：哈希更新、只撤销其它会话、不影响他人会话、Argon2id 往返与损坏哈希容错。测试数 51 → 57。

### 新增（协作与文档同步规则）

- 新增根目录 `AGENTS.md`：给 AI Agent 的项目级协作规则（三档授权、决策三问、调试三步、安全红线、质量门、文档同步、提交推送规范）。
- 新增 `docs/DOC_SYNC.md`：文档与版本同步规范，按星聚实际确立唯一真源（版本号 `package.json`、数字看 `verify` 输出、功能状态看公告真源与代码），含触发时机、同步清单、发布前验证与已知易漂移点。
- 两份新文档补进 `LICENSE-docs` 适用范围。

### 变更（文档与配置同步）

- 社区公告新增「可以自己改密码了」条目；「当前进度」未完成清单由六项更正为四项，并写明此前把「自行删除帖子」误列为未完成（该功能早已可用）。
- `.env.example` 移除已下线的 `INVITE_CODE`（统一邀请码早已改为一人一码）。
- `ARCHITECTURE.md`：路由表补 `change-password`、`security_events.kind` 补两种新事件、auth 模块职责补「自助改密」。
- `IMPLEMENTATION-PLAN.md`：M4 交付物补自助改密，新增 `VR-M4-10` 真实浏览器与端到端验证记录。

### 新增（通知中心）

- 通知读取 API：`GET /api/notifications`（键集游标翻页，每次 20 条）、`GET /api/notifications/unread`（未读数）、`POST /api/notifications/read`（一键全部已读），均需登录。
- 通知中心界面 `web/src/features/notifications/`：列表、相对时间、未读高亮、加载更早、全部已读。
- 顶栏铃铛红点角标（`TopBar.tsx`）：取未读数，超过 99 记为 `99+`；匿名态不展示。

### 变更（邀请制改为一人一码）

- 新增迁移 `009_invite_codes.sql`：`code_hash`（HMAC-SHA256 哈希存储明文邀请码，Crockford Base32 生成人读码）、状态机 `available→used/revoked`、创建 / 使用 / 撤销留痕与索引。
- 邀请码模块 `modules/invite/`：逐批生成（1–50，备注可选），明文仅在生成时返回一次；未用码可撤销，已用 / 已撤销不可改回。
- 注册改为事务内原子消费：同一事务 `UPDATE ... SET status='used' WHERE code_hash=$1 AND status='available'`，无效码整笔回滚，杜绝「码废号建成」。
- 下线统一邀请码：移除 `INVITE_CODE` 环境变量与 `inviteCodeMatches`；`auth.service` 改用哈希校验，旧通用码注册提示 `INVITE_INVALID`。
- 管理员「运营管理 → 邀请码」界面 `web/src/features/invite/`：生成 / 列表（可用 / 已用 / 已撤销）/ 撤销，均受 `requireRole(ROLE_ADMIN)` 守卫。

### 变更（社区公告改写为结构化发布记录）

- 公告条目由纯文本改为结构化字段：类型（新增 / 修复 / 规则 / 状态）、摘要、明细、需要用户配合的事项。参照 Discourse、GitHub Releases 的更新通告口径：先摘要后明细，明细写「变化 + 影响」，不写实现细节。
- 条数由 3 条补为 5 条，覆盖建站至今的四个里程碑；同类变更合并进同一条，不再一条功能一贴。
- 「当前进度与已知问题」单独成条，写明七项未完成能力。**已实现但无界面的能力不计入已完成**——收藏列表接口做了但个人页没有入口，因此列在缺口一侧。
- 公告不含版本号：公告是运营信息，与代码版本解耦；`1.2.0` 发版后仍按此政策不补版本号，版本信息以 `CHANGELOG.md` 与 Release 为准。
- 公告页与右栏卡片共用类型标签映射（`announcement-kinds.ts`），`Badge` 新增 `warn` 变体用于状态类标签。
- 公告条目拆到 `config/docs/announcements.doc.ts`，`constants.ts` 回落到 300 行预算内。
- `IMPLEMENTATION-PLAN` 的 `M4` 章节补一行进度：`S1`—`S3` 已交付，`S4` 未开始，收尾顺序为通知域在前、邀请码改造在后。


### 新增（免责声明与产品声明）

- **免责声明** `/disclaimer`：按「能免的写清、免不掉的写明」两段式撰写。常见做法是一句「概不负责」，但《民法典》第 506 条下造成人身损害、故意或重大过失造成财产损失的免责条款本就无效，写了不产生任何保护。这里改为逐项限定服务可用性风险，并单列一节「哪些责任免不掉」。
- 侵权处理写明要素与时限：通知须含权属证明、可唯一定位的内容位置、真实性承诺；收到后通常 3 个工作日内处理，最迟 7 日；被移除方可提交反通知。
- **产品声明** `/product`：说明定位、开放范围、合规状态与内容治理的实际能力。明确「不是平台 / 不是商业服务 / 不是公共服务 / 不是长期承诺 / 不是 App」，并如实披露代码主要由 AI 编程助手生成、运营者负责审阅与发布。
- 合规一节按事实写：非经营性、托管在境外（Vercel / Neon）、未办境内 ICP 备案（备案针对境内托管与接入）、不涉及需要前置许可的业务；若扩大开放或迁回境内会先办手续。
- 注册勾选同意扩为三份：《用户协议》《隐私说明》《免责声明》；协议中「组成部分」与冲突适用规则同步更新。
- 抽屉与个人页入口增至七项，新增「产品声明」「免责声明」。

### 修复（把域名当成了品牌）

- 《用户协议》原文写「你与星聚（starpal.cc.cd）之间的约定」，把访问地址当成了品牌名与协议主体；《隐私说明》原文写「适用于 starpal.cc.cd 网站及其背后的接口服务（以下统称「星聚」）」，直接把域名定义成了服务名称。两处都已改掉。
- 协议开头补一条三分定义：**星聚（STARPAL）** 是品牌与服务名、**运营者** 是维护它的个人、**starpal.cc.cd** 只是当前访问地址。域名不是品牌标识，也不是运营主体；日后更换域名，协议与说明继续适用于同一项服务。

### 新增（用户协议与同意记录）

- **补上缺失的第三份文档**：隐私说明与社区准则之外，社区类产品还缺一份《用户协议》。此前注册流程没有任何「同意条款」环节，等于三份文档都没有被正式接受过。新增 `/terms` 页与 `GET /api/meta/terms`，注册页增加勾选同意。
- 协议与准则定义为主从关系：准则构成本协议的组成部分，违反准则即违反本协议。避免两处规则各自演进后互相打架，也让处置有明确依据。
- 用户内容的授权范围严格限定为「存储、复制、展示、格式转换、分发」五项运营所必需的行为，明确排除商业使用、对外授权与训练 AI 模型——不会出现模板里「平台有权永久商业化利用用户内容」这类与本站实际做法矛盾的条款。
- **新增迁移 `008_terms_acceptance.sql`**：`users` 增加 `terms_accepted_at` 与 `terms_version`。依据《个人信息保护法》第十四条，基于同意的处理须能证明同意存在，只在前端勾选而不留记录等于没有同意。两列可空，因为脚本创建的账号与存量账号没走过注册表单，强行回填等于伪造同意记录。
- 同意与否不作为服务端准入条件（前端已强制勾选），但传了就必须落库；`acceptTerms` 只认严格的 `true`，其余一律视为未同意。
- 勾选框默认不预勾选——预勾选等于没问过。

### 变更（联系方式收敛到站内）

- 三份文档中的对外联系方式统一改为「站内私信社区长兼管理员 @Solvyre」，移除 GitHub Issues 渠道（仓库未公开，指向它没有意义）。
- 如实标注私信功能仍在开发中，上线前以「在社区公告帖下留言」作为过渡通道，避免写出一个点进去只有占位页的路径。

### 重写（隐私说明、社区准则与关于页）

- **隐私说明从 6 节扩到 14 节**，按 GitHub / Reddit 的骨架重写，覆盖《个人信息保护法》第十七条要求告知的全部事项（处理者身份、目的与方式、信息种类、保存期限、权利行使方式）。每条都对应到可验证的实现：会话 Cookie 的 `HttpOnly`/`SameSite=Lax`/`Secure` 属性、7 天有效期、Argon2id 的 64 MiB / 3 轮参数、防滥用摘要 30 天保留、图片重编码剥离 EXIF——不是照抄模板的「我们可能收集」。
- 新增两节此前缺失但影响最大的内容：**「公开内容意味着什么」**（发的帖子、评论、图片对未登录游客可见，搜索引擎可能收录，删帖收不回已被转载的副本）与**「我们明确不做的几件事」**（不出售、不画像、不训练模型、不发营销邮件、不做跨站追踪）。原文档只有「我们不采集手机号」这类否定，缺少正面承诺。
- **如实标注两处未实现的能力**：注册后无法自助改密、暂时不能删除自己的帖子。业内文档通常回避这类缺口，但写「你可以随时修改密码」而实际点不到按钮，比不写更糟。
- **社区准则从 4 条原则扩到 11 节**：零容忍条款（涉及未成年人的性内容、人肉搜索、仇恨言论、冒充身份等）、发帖规范（标题、话题归属、转载授权、AI 生成内容须标注）、互动规范、账号安全、四级处置阶梯、申诉流程，以及**对管理员的约束**（不因观点删帖、涉己回避、处置留痕）。原文档的「可通过站内申诉路径反馈」指向一个根本不存在的入口，已改为真实可用的两个外部渠道。
- 数据层从 `{ heading, paragraphs[] }` 升级为块结构 `DocBlock`（段落 / 小节 / 清单 / 提示块），清单能真正排成列表而不是挤成一段长文字；文档新增 `updatedAt` / `effectiveAt` 双日期与开头摘要——长文默认没人读完，把底线提到第一屏才有意义。
- **关于页从三行字扩为完整自述**：站点定位、三条原则、技术构成与致谢、反馈渠道。技术栈只写「用了什么、为什么」，**刻意不列版本号**——精确版本等于告诉攻击者该试哪个已知 CVE，而本站没有专职安全响应能力。
- 长文拆到 `server/src/config/docs/`：`privacy.doc.ts` / `privacy-rights.doc.ts` / `guidelines.doc.ts` / `about.doc.ts`，常量文件只做组装，守住单文件 300 行预算。文案仍随代码版本化、不入库，页面展示的即当前代码的真实行为。

### 新增（图片大图查看）

- 详情页配图此前只能看缩略图：单图按 4:3—1.91:1 裁切、多图是正方形裁切，竖图与长图的中段之外一概看不到，也没有任何「看原图」的通路。现补上灯箱：点任意配图进入整屏 `contain` 原比例视图，不裁切。
- 三种输入都覆盖：鼠标（点遮罩或按钮关闭）、键盘（`←` `→` 切换、`Esc` 关闭）、触摸（左右滑动超过 48 px 切换）。只做其中一种，换个设备就会重现「能看不能关」或缺切换的问题。
- 多图支持循环切换与 `2 / 3` 计数。遮罩色新增令牌 `--sp-scrim`（近黑 94%），而非复用对话框的浅灰蒙层——看图时背景越暗，对画面颜色的判断越准；硬编码色值会被 lint 硬规则 R2 拦下，故收敛进 `tokens.css`。

### 修复（移动端说明页入口缺失）

- **手机端此前根本无法到达社区准则与隐私说明**：这两个页面早就在，但唯一入口是「个人页底部」的两个按钮，抽屉菜单里没有；`/api/meta/announcements` 更不存在，公告只以硬编码文案躺在右栏卡片里，而右栏只在 ≥1280 px 显示。三重叠加的结果是：手机上公告完全不可见，准则与隐私几乎不可达。
- 抽屉底部新增「关于」分组：社区公告 / 社区准则 / 隐私说明 / 关于星聚。入口定义收进 `nav-items.ts` 的 `ABOUT_LINKS`，桌面侧栏与抽屉共用一份，杜绝「改了一边忘了另一边」。抽屉同时加 `overflow-y-auto`——入口从 7 项增至 11 项，iPhone SE 一类矮屏不滚动会把底部四项裁掉。
- **桌面侧栏那张「社区准则」卡片原本点不进去**：它只是静态文案，标题写着「社区准则」却没有任何链接，属于「看起来是入口、实际是装饰」。改为可点击的入口组，并移除「热门榜单将在 M5 接入」这类开发期占位话术。
- 新增 `/announcements` 页与 `GET /api/meta/announcements`。公告文案从右栏硬编码收敛到后端 `ANNOUNCEMENTS` 常量，与 `GUIDELINES` / `PRIVACY` 同一口径（随代码版本化、不入库）；右栏卡片改为读接口，只显示最新一条并提供「查看全部公告」。

### 新增（内置话题「闲聊」）

- 新增迁移 `007_chat_topic.sql`：内置话题由九个增至十个，补上「闲聊」——原先九个话题都带主题倾向，新用户打招呼、说日常只能塞进「生活」或「其他兴趣」，分类信号被稀释。`sort_order = 0` 置于列表最前，作为社区入口区。
- 与 `003` 的写法刻意不同：`003` 是建表初始化，重复执行本就该报错；本条属数据补充，用 `ON CONFLICT (slug) DO NOTHING`，生产库已由运维先行插入同一 `slug` 时再跑迁移不会失败，也不会覆盖已改过的文案。
- 迁移版本连续性断言改为**动态校验**：原来硬编码 `['001' … '006']`，任何新增迁移都会让这条测试假失败，逼着人「改测试」而不是「查问题」。现改为排序后与自然序号逐位比对，守住「从 001 起、无缺口、无重复」三条不变量，新增迁移无需触碰测试。

### 新增（点赞与收藏）

- 新增 `PUT` / `DELETE /api/posts/:id/like` 与 `/bookmark`：四个端点均为**幂等**语义，重复请求返回当前计数而非报错；不提供 `POST /toggle`，显式动作在请求重放时不会把「赞」翻成「取消赞」。
- 计数与明细同事务：以 `INSERT ... ON CONFLICT DO NOTHING RETURNING` 判断是否真正新增，只有插入 / 删除成功才调整 `posts` 上的冗余计数。先查后插在并发下会算出两个 1；此路径由唯一约束裁决。取消时用 `GREATEST(count - 1, 0)` 兜住历史脏数据，不写负值。
- 幂等请求不写 `posts` 行：无实际变化时直接读当前计数，避免每次重复点击都产生一次元组版本与 WAL。
- 帖子投影新增 `bookmarkCount`、`isLiked`、`isBookmarked`。互动态是「读者 × 帖子」的关系，不写进投影 SQL（否则参数位置随信息流 / 相关帖 / 个人页变化，要维护多份变体），改为列表拿到 id 后一次批量查询再合并，避免 N+1；匿名读者不查库。
- 详情页新增 `PostInteractions`：点赞与收藏按钮先乐观翻转，请求返回后以服务端计数校正，失败回滚并提示；未登录点击跳转登录页。评论数仍在同一行展示，评论区占位文案改为「即将开放」。

### 新增（评论）

- 新增 `GET` / `POST /api/posts/:id/comments` 与 `DELETE /api/comments/:id`。读路径挂 `optionalAuth`：匿名读者照样能看列表（公开内容），登录读者额外拿到 `isAuthor` / `canRemove`。删除走评论自身路径，调用方不需要知道帖子 id。
- 评论与 `posts.comment_count` 同事务；计数更新带 `status = 'published'` 条件，帖子在可见性检查与写入之间被删除时整笔回滚，不产生「评论存在但帖子不可见」的孤儿记录。扣减用 `GREATEST(count - 1, 0)`，历史脏数据不会写出负数。
- 通知与评论同事务写入：评论成功而通知丢失，接收者永远不知道有人回复。`target_type='comment'`、`target_id` 为评论主键，自己评论自己的帖子不产生通知（`author_id <> 评论者`）。
- 移除区分两种语义：作者自删记 `deleted` 并写 `deleted_at`；管理员移除他人记 `removed` 且 `deleted_at` 为 NULL —— 这是 `comments_deleted_consistent` 约束的要求，写错会被数据库直接拒绝。被移除的评论对普通读者按不存在处理，管理员列表可见并标灰，与帖子「已移除仅管理员可见」同一口径。
- 详情页占位卡替换为真实评论区：发表框按 **Unicode 码点**计数（emoji 算 1，与后端同口径）、超限禁用提交；列表时间倒序（最新在上）、支持加载更多；作者与管理员看到删除入口，删除需二次确认；未登录显示登录引导而非输入框。

### 新增（自动化测试设施）

- 新增 `server/tests`：Node 内置 `node:test` + `tsx` 运行 TypeScript 测试；`@electric-sql/pglite`（WASM PostgreSQL）在内存中按序执行 `001`–`006` 全部迁移，测试之间互不影响、不连接任何真实库，进程结束即丢弃。`npm test` 一条命令跑完，已并入 `npm run verify`。
- 首批 30 项断言覆盖字符串校验原语与互动域结构约束：长度口径、emoji 计数、纯空白、孤立代理项、点赞 / 收藏唯一性、评论状态机与软删除一致性、通知类型与目标成对、删帖级联、`actor_id` SET NULL。
- 点赞 / 收藏的计数事务另加 12 项断言（`runToggle` 直测）：重复点赞幂等、重复取消幂等、计数不为负、收藏与点赞互不影响、不存在帖不产生孤儿明细；互动态批量补齐 4 项（匿名全 false、按帖标记、他人状态隔离、空列表不查库）。
- 评论另加 9 项断言：计数与评论同生同灭、自评论不产生通知、`deleted` / `removed` 的 `deleted_at` 语义、重复移除幂等且计数不为负、帖子不存在时事务整体回滚、时间倒序、游标不重不漏、移除项对普通读者不可见对管理员可见。
- 当前合计 **51 项断言**。

### 变更（评论长度标准）

- 评论正文上限由 1000 调整为 **2000 字符**（`006_comment_length.sql`）。依据：Discourse 默认 32000（论坛长帖语义）、Reddit 评论 10000（英文长评文化）、微博正文 2000、小红书正文 1000；本项目帖子正文支持 20000，评论取正文的十分之一，容纳一段完整论证而不把评论区变成文章区。长度统一按 **Unicode 码点** 计，emoji 算 1。

### 修复（评论外键竞态）

- 帖子在可见性检查与写入之间被物理删除时，评论插入会撞外键并冒成 500。现与点赞模块同一处理：捕获 `23503` 转译为 `NOT_FOUND`，竞态表现成 404 而不是服务器错误。

### 修复（长度计数口径与非法 Unicode）

- **服务层与数据库的长度口径分裂**：`requireString` 用 `String.length`（UTF-16 码元）计数，一个 emoji 算 2，与 PostgreSQL `char_length`（码点）不一致——10 个 emoji 会被判成 20 字符而误拒。改为 `countChars()`（`Array.from`）计数，并在测试中锁定「10 个 emoji 满足 max=10」「ZWJ 家庭 emoji 按 7 码点计」。
- **孤立代理项导致 500**：未配对的 `\uD800` 能通过长度校验，进入 pg 参数编码阶段抛错，用户看到的是服务器错误而非字段提示。现在在长度判定前用孤立代理正则拦截，返回 `VALIDATION_FAILED` 并指出字段。
- **纯换行评论绕过非空约束**：`btrim(body)` 只裁普通空格，只有换行 / 制表符的评论能通过「非空」判定。约束改为 `btrim(body, E' \t\n\r\f\v')`，四组纯空白样本均被拒。全角空格等 Unicode 空白由服务层 `trim()` 归一化。

## [1.1.0] - 2026-11-14

`M3` 内容域随本版本交付：浏览信息流、挑话题、写正文、配图、发布、编辑与删除全流程可用。`M3-S4` 仅交付读侧，管理端话题增删改与 `moderation_logs` 留痕仍随管理后台一并交付。

### 修复（版本号显示与一致性）

- **设置页版本号长期显示错误**：「关于」区块的版本号是硬编码的 `'0.1.0'`，自 `v1.0.0` 起便与实际版本脱节，用户看到的版本与 `/api/health` 返回的版本不一致。现改为构建期由 `web/vite.config.ts` 从 `package.json` 注入 `__APP_VERSION__`，前端不再持有第二份版本号。
- `scripts/lint.mjs` 新增硬规则 **R4**：根 / `web` / `server` 三处 `package.json` 与 `server/src/config/constants.ts` 的 `APP_VERSION` 必须一致，不一致即质量门失败。已用反向用例确认检查真实生效（把 `APP_VERSION` 临时改为 `1.0.9`，`lint` 如期报错并指出四处取值）。
- 设计系统预览页（`/_preview`）顶栏原标注「设计系统 · v0.1.0」，该版本号与产品版本无关，却极易被误读为应用版本。改为「设计系统预览」，不再持有一个会独立漂移的版本号。

### 新增（移动端导航与品牌标识）

- **手机端补回品牌名**：顶栏品牌名原以 `hidden sm:inline` 限定宽度 ≥ 640 px 才渲染，而手机竖屏最宽约 430 px，永远达不到该阈值，导致移动端只剩星形标志、全站无一处显示「星聚」。现将品牌名拆为两段——「星聚」恒显，浅色副标 `STARPAL` 仍在 ≥ 640 px 出现，避免窄屏被一长串英文挤占。实测 320 / 360 / 390 / 412 四档 `scrollWidth` 均等于视口宽度，无横向溢出；最窄的 320 px 下品牌区与右侧操作区仍余 16 px。
- **抽屉菜单顶部换成品牌行**：原为「导航」二字，现改为星形标志 + 「星聚 STARPAL」。原标题降为 `sr-only` 并继续承载 `aria-labelledby`，读屏播报仍为「导航」，不因视觉改动引入语义噪声。
- **抽屉导航项改回左对齐**：`cn()` 只做字符串拼接、不做类名冲突消解，基础样式的 `justify-center` 与调用方追加的 `justify-start` 同时存在时前者胜出，菜单项因此整体居中。桌面侧栏一直左对齐，同一个站点的两处导航本不该不一致；居中在出现四字话题名时还会让各条起点参差。改用 `!justify-start` 显式覆盖，实测计算值为 `flex-start`。

### 修复（图片缓存与删除语义）

- 图片响应头由 `public, max-age=31536000, immutable` 改为 `public, max-age=3600`。生产实测发现：作者删除图片后，旧 URL 仍被 Vercel CDN 以长缓存继续返回（加查询串绕开缓存后即为 `404`，说明源站已删、缓存未失效）。键随机不等于可用性不变，一年缓存让「删除」在边缘节点上一年内不生效。降至一小时，删除在可接受时间内生效，同时仍覆盖一次浏览内的重复取图。

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
- 实施计划中 `M3-S3`「前端选图未做」、`M3-S5`「图片例外」等过期标记按实际完成情况更正；`VR-M3-14` 记录的 `Cache-Control: max-age=31536000` 是变更前取值，补注后续已调整为 `max-age=3600`。

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
