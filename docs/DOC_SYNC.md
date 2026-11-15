# 文档与版本同步规范（DOC SYNC）

> 定位：代码 / 依赖 / 许可 / 功能变化后，让「文档描述」与「代码事实」保持一致的**执行清单**。
> 与 `AGENTS.md`（协作规则）、`IMPLEMENTATION-PLAN.md`（里程碑与验证记录）配套。
>
> **唯一真源原则（星聚实际）**：
> - **版本号**：以根 `package.json` 的 `version` 为唯一真源，构建注入 `__APP_VERSION__`；
>   由 `lint` 的 `R4` 保证根 / `web` / `server` 三个 `package.json` 与 `APP_VERSION` 同源。
>   **当前 `1.3.0`**（`M5` 收尾版本，已发布；`1.2.0` 为 `M4` 收尾版本，`1.1.0` 早已发布）。公告按政策不含版本号，
>   日常变更累积在 `CHANGELOG.md` 的 `[Unreleased]`。因此本规范**不要求每次变更 bump 版本**；
>   发版是 🟡「先问」类决策，须作者拍板后统一处理（bump 四处版本号 + lock + `[Unreleased]` 转正 + 打 tag / Release）。
> - **数字**（测试数、文件数、迁移数、依赖数）：以 `npm run verify` / `npm test` / 文件系统的**实际输出**为准，禁止写死在文档里。
> - **功能 / 状态描述**：以**代码实现**为唯一真源；对用户的公开口径以 `server/src/config/docs/announcements.doc.ts` 为唯一真源。
>   「已实现但无界面」算**未完成**（沿用公告既定口径）。文档不得超出实现。
> - **依赖**：以 `package.json` + `package-lock.json` 为唯一真源，派生到 `THIRD-PARTY-NOTICES.md`。
> - **许可**：`LICENSE`（代码 AGPL-3.0-or-later）、`LICENSE-docs`（文档 CC BY-NC-SA 4.0）、
>   `TRADEMARK.md`（品牌保留）、`COPYRIGHT`（归属对照）、`THIRD-PARTY-NOTICES.md`（第三方）共同构成，改动任一都要互相一致。

---

## 一、触发时机（任一发生即触发同步）

- [ ] 功能新增 / 修改 / 移除（含把「未完成」划为「可用」）
- [ ] 数据库迁移新增（`server/src/db/migrations/0xx_*.sql`，只增不改历史）
- [ ] 依赖新增 / 移除 / 升级
- [ ] 许可证 / 商标 / 版权 / SPDX 头变化
- [ ] 质量门 / lint 规则 / CI / 部署方式变化
- [ ] 社区公告、协议文档（`server/src/config/docs/*.doc.ts`）变化
- [ ] 里程碑进度、验证记录（`VR-Mx-xx`）回填
- [ ] **正式发版**（🟡 先问：bump 版本 + 转 `[Unreleased]` 为正式条目，见第四节）

---

## 二、同步清单（逐项勾选）

### A. 版本号（唯一真源：根 `package.json`）

> 仅在「正式发版」时执行；日常功能变更**不动版本号**。

| 位置 | 动作 | 校验方式 |
| --- | --- | --- |
| 根 `package.json` | bump `version` | — |
| `web/package.json`、`server/package.json` | 与根一致（`R4`） | `npm run lint` |
| `package-lock.json` | 顶层 + `packages[""]` + 各 workspace 版本一致 | grep |
| `server/src/config/constants.ts` 的 `APP_VERSION` | 与包版本同源（`R4`） | `npm run lint` |
| `CHANGELOG.md` | `[Unreleased]` → 新版本正式条目 | 人工 + grep |
| `README.md` / `docs/IMPLEMENTATION-PLAN.md` | 若出现版本号叙述，同步 | grep |
| `server/src/config/docs/announcements.doc.ts` | 发版后再决定是否补版本号（默认仍不含） | 人工 |

### B. 数字与事实（唯一真源：实际输出）

| 数据 | 真源 | 需要同步的位置 |
| --- | --- | --- |
| 测试数 / 通过数 | `npm test` 输出 | 公告、`docs/IMPLEMENTATION-PLAN.md` 验证记录、`CHANGELOG.md`（若提及） |
| 扫描文件数 / 行数预算结论 | `npm run check:size` 输出 | 交付说明、`docs/IMPLEMENTATION-PLAN.md`（若引用） |
| 迁移数量与编号 | `ls server/src/db/migrations/` | `docs/ARCHITECTURE.md`、`docs/IMPLEMENTATION-PLAN.md` |
| 依赖清单（增 / 删 / 升级） | `package.json` / `package-lock.json` | `THIRD-PARTY-NOTICES.md`（含传递依赖分布）、`README.md` 致谢区 |
| 功能 / 状态描述 | 代码实现 | `server/src/config/docs/announcements.doc.ts`（status 条目的「可用/未完成」）、`README.md`、`docs/PRD.md`、`docs/IMPLEMENTATION-PLAN.md` |
| 环境变量 / 配置项 | `server/src/config/env.ts` | `.env.example`（键名，不写真实值）、`docs/DEPLOYMENT.md` |
| 端点与请求/响应形状 | `server/src/**/*.routes.ts` / `*.controller.ts` | `web/src/features/**/api.ts`、`docs/ARCHITECTURE.md` |

### C. 文档索引与配对

- [ ] `README.md` 的「许可与第三方」表：新增许可文件（如 `TRADEMARK.md`）已列入
- [ ] `COPYRIGHT` 的许可文件对照表：与 `README.md` 一致
- [ ] `LICENSE-docs` 的「适用范围」：新增的文档/规则文件已补进（如 `AGENTS.md`、`docs/DOC_SYNC.md`）
- [ ] 新增文档若属 `LICENSE-docs` 范围，已在其中登记；新增源码已带 SPDX 头
- [ ] `THIRD-PARTY-NOTICES.md` 的「由脚本生成」说明：依赖变动后重新生成

### D. 公告与协议（对社区用户的公开口径）

- [ ] `server/src/config/docs/announcements.doc.ts`：功能上线补 `feature` 条、规则变化补 `rule` 条、
      `status` 条目的「未完成」清单同步划掉已完成项、`summary` 里的数字（如「六项」）与清单条数一致
- [ ] 协议类文档（`terms` / `privacy` / `disclaimer` / `product` / `guidelines` 及其 `-*-sections` 拆分文件）：
      描述与实际行为一致，未实现能力标为缺口，删掉指向不存在入口的表述
- [ ] 公告日期用当天（`date +%Y-%m-%d`），按时间倒序，最新在前

### E. 里程碑与验证记录

- [ ] `docs/IMPLEMENTATION-PLAN.md`：对应 `M`/`S` 小节标完成、新增/回填 `VR-Mx-xx` 验证记录
      （状态「通过 / 待回填」，写清真实命令、环境、断言与结果，不编造）
- [ ] `CHANGELOG.md` 的 `[Unreleased]`：覆盖本次全部用户可见变更（过去时态），计划性工作不计为已交付

---

## 三、发版判定（仅发版时用，参考 SemVer）

| 变化类型 | 版本动作 | 说明 |
| --- | --- | --- |
| 新增用户可见功能 | minor | 如 `1.2.0 → 1.3.0`（本次） |
| 修复 bug / 安全修复 | patch | 如 `1.3.0 → 1.3.1` |
| 仅文档 / CI / 工程变更 | patch 或不 bump | 本项目日常多属此类，进 `[Unreleased]` 即可 |
| 破坏性变更 | major | 需先过决策三问 |

**当前口径**：`M5` 已随 `1.3.0` 发版（`1.2.0` 为 `M4` 收尾版本，`1.1.0` 为更早的已发布版本）。日常变更继续在 `[Unreleased]` 累积，是否发新版由作者按上表拍板；公告始终不含版本号。

---

## 四、提交 / 推送前验证（必须跑）

1. `npm run verify` 全绿（typecheck / build / check:size / lint / test）——贴出真实输出。
2. **事实一致性 grep**：
   - 旧版本号残留：`grep -rn "旧版本号" --include="*.md" --include="*.json" .`（命中仅允许是历史记录）。
   - 公告「未完成」清单里的项，逐条与代码核对，删掉已实现的（如「自行删除帖子」实际已有）。
   - `.env.example` 键名与 `env.ts` 一致，无已下线变量残留（如旧的 `INVITE_CODE`）；`DEPLOYMENT.md` 的 §3 / §4 / §15 / §18.9 现行变量表与 `.env.example` 同口径（§18 历史验证记录里的已下线变量属当时口径，靠「历史记录时效说明」覆盖，不改写原文）。
   - 迁移编号：`IMPLEMENTATION-PLAN.md` 中 M5 / M6 计划的文件名编号须与 `server/src/db/migrations/` 实际占用不冲突（现到 `021`，新迁移从 `022` 起，计划里用 `NNN_` 占位）。迁移只增不改，照抄旧编号会覆盖历史迁移。
3. **公告 status 条自洽**：`summary` 的数字 == `未完成` 清单条数 == 实际未完成能力数。
4. **许可文件互相一致**：`README.md` 表 ↔ `COPYRIGHT` 表 ↔ `LICENSE-docs` 适用范围 ↔ 实际文件。
5. **CHANGELOG**：本次用户可见变更已入 `[Unreleased]`，未把「计划」写成「已交付」。
6. **验证记录**：`VR-Mx-xx` 已回填真实结果，不留「待回填」占位（除非确属未做，需说明）。

> 🟡 「代码与文档同步完成后才能推送」——推送属先问类，见 `AGENTS.md` 第九节。

---

## 五、同步检查模板（提交信息 / 汇报可引用）

```markdown
## DOC SYNC CHECK
- 变更类型：功能 / 修复 / 文档 / 许可 / 依赖 / 迁移（圈出）
- 是否发版：否（默认）/ 是（版本号 ____，已过决策三问）
- verify：全绿（贴输出）｜ 测试数：____（实际输出）
- [ ] CHANGELOG `[Unreleased]` 已更新
- [ ] 公告：feature/rule 条目已补；status「未完成」清单已划掉已完成项；数字自洽
- [ ] 协议文档与实际行为一致
- [ ] IMPLEMENTATION-PLAN：里程碑状态 + VR-Mx-xx 已回填
- [ ] 依赖变动：package.json / lock / THIRD-PARTY-NOTICES / README 致谢一致
- [ ] 许可一致：README 表 / COPYRIGHT / LICENSE-docs 范围 / 新增文件 SPDX 头
- [ ] .env.example 键名与 env.ts 一致，无残留
- [ ] 事实一致性 grep 已跑，无旧版本号 / 无漂移
```

---

## 六、与现有体系的关系

| 文件 | 角色 |
| --- | --- |
| `AGENTS.md` | 协作规则；把「文档同步」列为发布/推送必查项 |
| `CHANGELOG.md` | 用户可见变更的出口；发版前累积在 `[Unreleased]`，发版后转为带日期的正式条目 |
| `docs/IMPLEMENTATION-PLAN.md` | 里程碑进度 + `VR-Mx-xx` 验证记录的唯一出处 |
| `server/src/config/docs/announcements.doc.ts` | 面向社区用户的**功能状态唯一真源** |
| `README.md` / `COPYRIGHT` / `LICENSE*` / `TRADEMARK.md` / `THIRD-PARTY-NOTICES.md` | 许可与版权体系，需互相一致 |
| `docs/ARCHITECTURE.md` / `PRD.md` / `DEPLOYMENT.md` | 架构、需求、部署描述，随对应实现同步 |

---

## 七、本项目已知易漂移点（重点盯）

1. **公告 status 清单**：功能做完了没划掉（历史教训：「自行删除帖子」早已实现却仍列在未完成）。
   每次功能交付必须回头核对这一条。
2. **公告不含版本号**：别因为发了新功能就往公告里写版本；发版是单独决策。
3. **`.env.example` 残留**：统一邀请码下线后，旧变量容易留在示例里——变量名以 `env.ts` 为准。
4. **数字写死**：测试数、文件数会随开发变化，文档引用时以当次实际输出为准，别复制旧数字。
5. **协议文档与代码**：新增能力（如通知、改密）后，隐私说明/社区准则若涉及相关描述要跟着核对。
6. **分离式许可**：新增文档要补进 `LICENSE-docs` 范围；新增源码要带 SPDX 头；品牌资产勿混入 CC/AGPL 授权。
7. **发版时版本号多处同步**：`README.md` 顶部版本徽章、`README.md` 版本表、四处机器真源（根 / `web` / `server` 的 `package.json` 与 `APP_VERSION`）、`package-lock.json` 四处、`CHANGELOG.md`（`[Unreleased]` 转正）、git tag 与 Release 标题须一致；`docs/*.md` 头部的 `v1.0.0` 是**架构基线标记，故意不改**。

> 一句话：**版本问 package.json（当前别乱 bump），数字问 verify 输出，功能状态问公告真源与代码，推送前 grep 一遍再走。**
