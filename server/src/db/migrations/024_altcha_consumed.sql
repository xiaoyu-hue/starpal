-- 迁移 024：ALTCHA 人机验证的一次性挑战消费记录
-- 对应 IMPLEMENTATION-PLAN 安全加固；ALTCHA 官方文档要求自托管必须自行防重放。
-- 依赖：无新表外键，独立存在。
-- 回滚影响：仅删除本表，不影响既有账户与会话；已消费的挑战记录丢失等于短时内可重放旧 payload，
--           但 payload 自带过期时间（默认 20 分钟），故窗口有限。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS。

-- 只存 payload 的不可逆摘要，不存原始 payload（含挑战数据），避免留存可重放材料。
CREATE TABLE altcha_consumed (
  payload_hash VARCHAR(64) PRIMARY KEY,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 清理按过期时间扫描；主键已覆盖去重查询。
CREATE INDEX altcha_consumed_expires_idx ON altcha_consumed (expires_at);
