-- SPDX-License-Identifier: AGPL-3.0-or-later
-- 迁移 022：治理数据模型（M6-S1）。
-- 对应 ARCHITECTURE.md §7.3「moderation_logs（v1.0 规划）」与 §6.2 脱敏公开视图，
-- IMPLEMENTATION-PLAN.md M6-S1-T1 / T2。
-- 依赖：001 users、003 posts、005 comments、011 reports 均已落地。
-- 只增不改：本迁移只建新表 / 新视图，并用 ALTER 放宽 reports 两处 CHECK；
--           011_reports.sql 作为历史迁移不修改，已应用记录不变。
-- 回滚影响：日志表与视图为新增，删除即消失；reports 的 CHECK 放宽可在补偿迁移里收回。
-- 幂等说明：由迁移执行器按 version 控制，文件内不使用 IF NOT EXISTS 以暴露意外重复。

-- 1. 审核日志：只追加（append-only），任何处置动作写一行，永不 UPDATE / DELETE。
--    约束层面不强制「不可改」（那需要 REVOKE 权限或触发器，应用层用单一 DB 角色无法真正隔离），
--    真正的「只追加」由服务层不提供改删接口 + 权限守卫保证；表结构只保证字段完整与可检索。
CREATE TABLE moderation_logs (
  id          BIGSERIAL PRIMARY KEY,
  -- 操作者：管理员账号。ON DELETE SET NULL 而非 CASCADE——账号被清理时日志仍需留存，
  -- 故 actor_id 允许变 NULL（保留动作与目标，仅丢失是谁操作的）。
  actor_id    BIGINT REFERENCES users (id) ON DELETE SET NULL,
  -- 动作采用点分命名：post.remove / comment.restore / user.suspend / report.dismiss 等。
  -- 不建动作字典表：动作是代码里的有限枚举，字典表只会多一处真源。
  action      VARCHAR(64) NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  target_id   BIGINT NOT NULL,
  -- 附加信息（前后状态、原因等）。JSONB 便于结构化检索，不存 HTML、不存敏感明文。
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT moderation_logs_action_nonempty CHECK (btrim(action) <> ''),
  CONSTRAINT moderation_logs_target_nonempty CHECK (btrim(target_type) <> '')
);

-- 完整日志按时间倒序翻页；管理端筛选单一对象时走 target 复合索引。
CREATE INDEX moderation_logs_created_idx ON moderation_logs (created_at DESC, id DESC);
CREATE INDEX moderation_logs_target_idx ON moderation_logs (target_type, target_id, created_at DESC);

-- 2. 脱敏公开视图：只暴露动作类型、时间与对象类型（PRD §3.2、FR-ADMIN-06）。
--    刻意不含 actor_id / target_id / metadata：公开记录要让人看见「治理在发生」，
--    但不能反推出是谁操作、针对哪一条具体内容、内部写了什么。
CREATE VIEW moderation_public_log AS
SELECT
  action,
  target_type,
  created_at
FROM moderation_logs
ORDER BY created_at DESC, id DESC;

-- 3. 举报表放宽两处 CHECK：
--    a) 状态机补 reviewing（pending → reviewing → resolved/dismissed）。
--       011 的三态只有 resolved/dismissed 需要 resolved_at；reviewing 属处理中，
--       必须满足与 pending 相同的「三字段全空」约束，否则会出现半成品状态。
ALTER TABLE reports DROP CONSTRAINT reports_status_valid;
ALTER TABLE reports ADD CONSTRAINT reports_status_valid
  CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed'));

ALTER TABLE reports DROP CONSTRAINT reports_resolution_valid;
ALTER TABLE reports ADD CONSTRAINT reports_resolution_valid CHECK (
  (status IN ('pending', 'reviewing') AND resolved_at IS NULL AND resolved_by IS NULL)
  OR (status IN ('resolved', 'dismissed') AND resolved_at IS NOT NULL)
);

--    b) 目标类型补 user：不当行为举报指向账号本身，仍是多态目标，服务层校验存在性与可见性。
ALTER TABLE reports DROP CONSTRAINT reports_target_valid;
ALTER TABLE reports ADD CONSTRAINT reports_target_valid CHECK (
  (kind = 'report' AND target_type IN ('post', 'comment', 'user') AND target_id IS NOT NULL)
  OR (kind = 'appeal' AND target_type IS NULL AND target_id IS NULL)
);
