-- 迁移 003：话题与帖子
-- 对应 ARCHITECTURE.md §7.3 表定义 / §7.4 索引策略；IMPLEMENTATION-PLAN.md M3-S1-T1
-- 依赖：001 已建立 users 表。
-- 回滚影响：两张表均为新增；回滚须以新增补偿迁移实现（DROP 会造成内容丢失）。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

-- 话题：内容的分类容器。slug 对外定位，内部 ID 不对外枚举。
CREATE TABLE topics (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(64) NOT NULL UNIQUE,
  name_zh     VARCHAR(64) NOT NULL,
  name_en     VARCHAR(64) NOT NULL,
  description TEXT,
  icon        VARCHAR(64),
  sort_order  INT NOT NULL DEFAULT 0,
  is_demo     BOOLEAN NOT NULL DEFAULT false,
  created_by  BIGINT REFERENCES users (id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- slug 只允许小写字母、数字、连字符，避免大小写与非法字符造成路由歧义。
ALTER TABLE topics
  ADD CONSTRAINT topics_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE topics
  ADD CONSTRAINT topics_name_nonempty CHECK (btrim(name_zh) <> '' AND btrim(name_en) <> '');

-- 发现页三个视图共用：按展示顺序取未归档话题。
CREATE INDEX topics_list_idx ON topics (sort_order, id) WHERE deleted_at IS NULL;

-- 帖子：归属单一话题；状态机与软删除由服务层控制，数据库以检查约束兜底。
CREATE TABLE posts (
  id             BIGSERIAL PRIMARY KEY,
  author_id      BIGINT NOT NULL REFERENCES users (id),
  topic_id       INT NOT NULL REFERENCES topics (id),
  title          VARCHAR(180) NOT NULL,
  body           TEXT NOT NULL,
  excerpt        TEXT NOT NULL,
  status         VARCHAR(16) NOT NULL DEFAULT 'published',
  like_count     INT NOT NULL DEFAULT 0,
  comment_count  INT NOT NULL DEFAULT 0,
  bookmark_count INT NOT NULL DEFAULT 0,
  is_demo        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

ALTER TABLE posts
  ADD CONSTRAINT posts_status_valid
  CHECK (status IN ('draft', 'published', 'removed', 'deleted'));
ALTER TABLE posts
  ADD CONSTRAINT posts_title_nonempty CHECK (btrim(title) <> '');
ALTER TABLE posts
  ADD CONSTRAINT posts_body_nonempty CHECK (btrim(body) <> '');
-- 计数为冗余字段，只允许非负，防止并发扣减写出负数。
ALTER TABLE posts
  ADD CONSTRAINT posts_counts_nonnegative
  CHECK (like_count >= 0 AND comment_count >= 0 AND bookmark_count >= 0);
-- 软删除必须与 deleted 状态同时出现，避免出现「有删除时间却仍可见」的记录。
ALTER TABLE posts
  ADD CONSTRAINT posts_deleted_consistent
  CHECK ((deleted_at IS NULL) = (status <> 'deleted'));

-- 最新信息流：部分索引只覆盖可见帖子，排序键为游标分页的键集依据。
CREATE INDEX posts_latest_idx
  ON posts (created_at DESC, id DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- 话题筛选流：与游标（created_at, id）配合，避免大偏移量分页。
CREATE INDEX posts_topic_idx
  ON posts (topic_id, created_at DESC, id DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- 作者帖子列表：个人页与「我的帖子」。
CREATE INDEX posts_author_idx
  ON posts (author_id, created_at DESC);

-- 热门排序：时间窗内按净赞取数。
CREATE INDEX posts_popular_idx
  ON posts (like_count DESC, created_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- 九个内置话题随结构迁移写入：FR-TOPIC-01 要求「初始化迁移后可直接查询」。
-- 属产品内置分类，非演示数据，故 is_demo = false、created_by 为 NULL（系统创建）。
INSERT INTO topics (slug, name_zh, name_en, description, icon, sort_order) VALUES
  ('technology', '科技数码', 'Technology & Digital', '新硬件、软件与数码生活的实测与讨论。',       'cpu',        1),
  ('gaming',     '游戏',     'Gaming',               '主机、PC 与独立游戏的通关、攻略与闲聊。',   'gamepad',    2),
  ('anime',      '动漫文化', 'Anime & Culture',      '动画、漫画与同人创作的作品与角色谈。',       'sparkles',   3),
  ('learning',   '学习成长', 'Learning & Education', '学习方法、考试经验与自我提升的记录。',       'book',       4),
  ('lifestyle',  '生活',     'Lifestyle',            '日常、美食、居家与城市生活里的细碎发现。',   'coffee',     5),
  ('creative',   '创作艺术', 'Creative Arts',        '写作、绘画、设计、摄影与手作的创作分享。',   'palette',    6),
  ('science',    '科学',     'Science',              '物理、生物、天文与前沿研究的科普与提问。',   'atom',       7),
  ('sports',     '运动',     'Sports',               '球类、跑步、健身与户外运动的过程与心得。',   'activity',   8),
  ('other',      '其他兴趣', 'Other Interests',      '不属于以上分类的兴趣，也能在这里找到同好。', 'compass',    9);
