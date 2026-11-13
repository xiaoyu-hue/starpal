-- 迁移 001：角色与账户核心表
-- 对应 ARCHITECTURE.md §7.3 / 索引策略 §7.4
-- 回滚影响：本迁移为基础表，删除将级联影响 user_profiles、sessions、posts 等全部后续表；
--           已应用后不修改本文件，回滚须以新增补偿迁移实现，且需先迁移或归档全部业务数据。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

CREATE TABLE roles (
  id          SMALLINT PRIMARY KEY,
  name        VARCHAR(32) NOT NULL UNIQUE,
  description TEXT
);

-- 角色字典为结构级基础数据，随建表一并写入，保证 users.role_id 外键默认值可用。
INSERT INTO roles (id, name, description) VALUES
  (1, 'user',  '普通成员'),
  (2, 'admin', '管理员');

CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  username       VARCHAR(32) NOT NULL UNIQUE,
  display_name   VARCHAR(64) NOT NULL,
  password_hash  TEXT NOT NULL,
  role_id        SMALLINT NOT NULL DEFAULT 1 REFERENCES roles (id),
  status         VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  last_login_at  TIMESTAMPTZ,
  CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended', 'deleted'))
);

-- 管理侧按状态与时间检索账户；登录名唯一性由 UNIQUE 约束自动建立索引。
CREATE INDEX users_status_created_idx ON users (status, created_at DESC);
