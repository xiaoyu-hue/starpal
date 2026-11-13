-- 迁移 002：个人资料、会话与安全事件
-- 对应 ARCHITECTURE.md §7.3 表定义 / §7.4 索引策略；IMPLEMENTATION-PLAN.md M2-S1-T1
-- 依赖：001 已建立 users 表。
-- 回滚影响：三张表均为新增，回滚须以新增补偿迁移实现；已有会话将全部失效。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

-- 可选资料与账户核心分离：新增展示字段只影响本表与 users 模块，不触碰 auth 与 sessions。
CREATE TABLE user_profiles (
  user_id      BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  avatar_url   TEXT,
  biography    TEXT,
  zodiac       VARCHAR(16),
  mbti         VARCHAR(8),
  age_band     VARCHAR(16),
  show_optional BOOLEAN NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 服务端会话：登出可主动删除，过期行由应用内清理任务删除，不引入外部调度服务。
CREATE TABLE sessions (
  id          VARCHAR(64) PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

-- 防刷与登录失败计数的来源以不可逆摘要标识，不长期保留原始网络地址，按保留期清理。
CREATE TABLE security_events (
  id           BIGSERIAL PRIMARY KEY,
  kind         VARCHAR(32) NOT NULL,
  subject_hash VARCHAR(64) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX security_events_lookup_idx
  ON security_events (kind, subject_hash, created_at DESC);
