-- 迁移 014：成就定义与解锁记录（M5-S2）
-- 对应 PRD §4.10 FR-ACH-01 / FR-ACH-02；ARCHITECTURE.md §7.3 表清单；IMPLEMENTATION-PLAN.md M5-S2-T1
-- 依赖：001 已建立 users（user_achievements 外键）。
-- 回滚影响：两张表均为新增；回滚须以补偿迁移实现（DROP 会丢失已解锁记录，徽章不可重建）。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

-- 成就定义：规则以数据形式存于 condition，业务代码只负责"取指标 + 比较阈值"。
-- 新增一条成就 = 插一行，不改任何 TypeScript（FR-ACH-01 的直接落点）。
CREATE TABLE achievements (
  code        VARCHAR(64) PRIMARY KEY,
  name_zh     VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  -- 图标为前端目录中的键名，不是 URL：前端按白名单映射到组件，避免任意字符串进渲染层。
  icon        VARCHAR(32) NOT NULL,
  -- 形如 {"metric": "posts_published", "gte": 1}。
  -- 只支持「单指标 + 阈值」：组合条件在真实需求里用不到，多条件引擎属过度设计。
  condition   JSONB NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  -- 允许下线单个成就而不删除解锁记录（历史时间线仍可读）。
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT achievements_code_format CHECK (code ~ '^[a-z0-9_]+$'),
  CONSTRAINT achievements_name_nonempty CHECK (btrim(name_zh) <> '' AND btrim(description) <> ''),
  -- 结构兜底：缺 metric 或 gte 非数字的行会让判定器静默失效，故在库层拒绝。
  -- 不在此白名单化 metric：指标集合属于代码侧注册表，新增指标不应要求改表；
  -- 数据写错由「种子行指标必须存在于注册表」的单元测试拦住，而不是靠 CHECK 枚举。
  CONSTRAINT achievements_condition_shape CHECK (
    jsonb_typeof(condition) = 'object'
    AND condition ->> 'metric' IS NOT NULL
    AND jsonb_typeof(condition -> 'gte') = 'number'
    AND (condition ->> 'gte')::numeric >= 0
  )
);

CREATE INDEX achievements_list_idx ON achievements (sort_order, code);

-- 解锁记录：复合主键即"同一用户对同一成就只解锁一次"（FR-ACH-02 的验收点）。
-- 不设代理键：记录本身没有独立身份，重复写入靠 ON CONFLICT DO NOTHING 吸收。
CREATE TABLE user_achievements (
  user_id          BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  achievement_code VARCHAR(64) NOT NULL REFERENCES achievements (code) ON DELETE CASCADE,
  unlocked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_code)
);

-- 时间线按解锁时间倒序读取。
CREATE INDEX user_achievements_recent_idx
  ON user_achievements (user_id, unlocked_at DESC);

-- 未使用：按成就统计解锁人数（后续若需展示"已有 N 人解锁"）。
-- 先建以免将来加索引要追加迁移，代价只有一次写入分摊。
CREATE INDEX user_achievements_code_idx ON user_achievements (achievement_code);

-- 首批九条成就：覆盖引导、活跃、被认可、社交与陪伴，全部指标均由现有表可算。
-- 数值刻意保守（社区规模小），不设"百赞""千帖"这类长期不可达的目标。
INSERT INTO achievements (code, name_zh, description, icon, condition, sort_order) VALUES
  ('first_post',         '初次发声', '发布你的第一篇帖子。',               'pen-line',       '{"metric": "posts_published",  "gte": 1}',  1),
  ('first_comment',      '回声',     '在别人的帖子下留下第一条评论。',     'message-circle', '{"metric": "comments_published", "gte": 1}', 2),
  ('three_topics',       '跨界的',   '在三个不同话题里发过帖。',           'compass',        '{"metric": "topics_covered",   "gte": 3}',  3),
  ('ten_posts',          '笔耕不辍', '累计发布十篇帖子。',                 'layers',         '{"metric": "posts_published",  "gte": 10}', 4),
  ('first_like_received','被看见',   '收到第一个赞。',                     'heart',          '{"metric": "likes_received",   "gte": 1}',  5),
  ('twenty_likes',       '共鸣',     '累计收到二十个赞。',                 'sparkles',       '{"metric": "likes_received",   "gte": 20}', 6),
  ('first_message',      '递出第一句话', '发出第一条私信。',               'send',           '{"metric": "messages_sent",    "gte": 1}',  7),
  ('inviter',            '引路人',   '你的邀请码被使用过一次。',           'user-plus',      '{"metric": "invites_used",     "gte": 1}',  8),
  ('veteran_30',         '同行三十天', '加入星聚满三十天。',               'calendar',       '{"metric": "days_since_join",  "gte": 30}', 9);
