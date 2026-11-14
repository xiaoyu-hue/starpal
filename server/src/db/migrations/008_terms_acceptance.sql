-- 迁移 008：同意记录的留存
-- 对应 PRD §4.12（说明页）与《个人信息保护法》第十四条：基于同意的处理，须能证明同意存在。
-- 依赖：001 已建立 users 表。
-- 回滚影响：两列均为新增且可空，回滚只需删除列，不影响既有数据与其他表。
-- 幂等说明：由迁移执行器按 version 幂等控制。

-- 为什么不设 NOT NULL：脚本创建的账号（init:admin）与迁移前的存量账号没有经过注册表单，
-- 强行回填等于伪造同意记录。为空即表示「未记录」，诚实好过补齐一个假时间戳。
ALTER TABLE users
  ADD COLUMN terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN terms_version VARCHAR(16);

COMMENT ON COLUMN users.terms_accepted_at IS
  '用户勾选同意用户协议的时间；为空表示未记录（存量账号或脚本创建）。';
COMMENT ON COLUMN users.terms_version IS
  '同意时的协议版本号，用于判断是否需要就新版协议重新征得同意。';
