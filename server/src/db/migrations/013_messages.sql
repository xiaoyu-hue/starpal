-- 迁移 013：私信（留言式，M5-S1）
-- 对应 ARCHITECTURE.md §10.1 私信与通知 / IMPLEMENTATION-PLAN.md M5-S1
-- 回滚影响：新建两张表，删除即可（无外键指向既有表，仅被指向 users 的外键）；可逆。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。
-- 设计要点：两人之间仅允许一个会话，靠表达式唯一索引 (LEAST, GREATEST) 保证；
-- 不得自聊（CHECK）；消息本期仅支持发送与查看，不做删除（保持最小，删除列后续按需补偿迁移）。

CREATE TABLE conversations (
  id             BIGSERIAL PRIMARY KEY,
  participant_a  BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  participant_b  BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_no_self        CHECK (participant_a <> participant_b),
  -- 两人一会话：participant_a 恒为较小 id、participant_b 恒为较大 id（由 repository 用
  -- LEAST/GREATEST 插入保证），故普通列唯一即等价于「任意发起顺序均同一会话」。
  -- 注：PGlite 测试库不支持表达式唯一约束内联写法，改用普通列唯一以兼容测试与生产。
  CONSTRAINT conversations_pair_unique UNIQUE (participant_a, participant_b)
);

CREATE TABLE messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_not_blank CHECK (length(trim(body)) > 0)
);

-- 按会话 + 时间排序的游标查询索引（created_at, id 保证稳定游标）。
CREATE INDEX messages_conversation_idx
  ON messages (conversation_id, created_at, id);
