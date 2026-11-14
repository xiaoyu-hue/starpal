-- SPDX-License-Identifier: AGPL-3.0-or-later
-- 迁移 011：举报 / 申诉最小闭环（M4 收尾后第 3 步，非 M6 完整治理后台）。
-- 设计：一张表用 kind 区分两类，避免为「几乎同构的两种诉求」建两套表与两套接口。
-- - report（举报）：指向站内具体内容，target_type + target_id 必填。
-- - appeal（申诉）：系统目前没有可挂靠的处置记录（停用账号靠维护者改库、
--   moderation_logs 尚未落地），故不指向具体目标，只记录用户写明的内容与理由。
-- 处置能力（移除内容 / 停用账号）不在本次范围，本表不做任何自动处置。
CREATE TABLE reports (
  id              BIGSERIAL PRIMARY KEY,
  kind            VARCHAR(16) NOT NULL,
  reporter_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- 多态目标：post / comment 分属两张表，无法建单一外键；
  -- 存在性与可见性由服务层经各模块 barrel 校验（伪造目标一律拒绝）。
  target_type     VARCHAR(16),
  target_id       BIGINT,
  reason          VARCHAR(32) NOT NULL,
  detail          TEXT NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',
  -- 管理员答复：说明维持原处理或驳回的理由；仅本人与管理员可见。
  resolution_note TEXT,
  resolved_by     BIGINT REFERENCES users (id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reports_kind_valid CHECK (kind IN ('report', 'appeal')),
  CONSTRAINT reports_status_valid CHECK (status IN ('pending', 'resolved', 'dismissed')),
  CONSTRAINT reports_target_valid CHECK (
    (kind = 'report' AND target_type IN ('post', 'comment') AND target_id IS NOT NULL)
    OR (kind = 'appeal' AND target_type IS NULL AND target_id IS NULL)
  ),
  CONSTRAINT reports_reason_nonempty CHECK (char_length(reason) > 0),
  CONSTRAINT reports_detail_nonempty CHECK (char_length(detail) > 0),
  -- 已处理才允许答复与处理人；未处理时三者必须同时为空，避免半成品状态。
  CONSTRAINT reports_resolution_valid CHECK (
    (status = 'pending' AND resolved_at IS NULL AND resolved_by IS NULL)
    OR (status <> 'pending' AND resolved_at IS NOT NULL)
  )
);

-- 「我的提交」按提交人 + 时间倒序键集翻页。
CREATE INDEX reports_mine_idx ON reports (reporter_id, created_at DESC, id DESC);
-- 管理队列按状态 + 时间倒序，pending 优先由前端筛选。
CREATE INDEX reports_queue_idx ON reports (status, created_at DESC, id DESC);
-- 防刷：同一用户对同一目标的未处理举报只保留一条；处置后允许就新情况再报。
-- 部分索引不含 appeal（其 target 为 NULL），申诉不受此限制。
CREATE UNIQUE INDEX reports_pending_target_idx
  ON reports (reporter_id, target_type, target_id)
  WHERE kind = 'report' AND status = 'pending';
