-- 迁移 005：互动域（点赞 / 收藏 / 评论 / 通知）
-- 对应 ARCHITECTURE.md §7.4；IMPLEMENTATION-PLAN.md M4-S1
-- 依赖：003 已建立 posts / topics，001/002 已建立 users。
-- 回滚影响：四张表均为新增；回滚须以补偿迁移实现（DROP 会丢失真实互动记录）。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

-- 点赞：同一用户对同一帖子至多一条。
-- 用复合主键而非代理键 + 唯一约束：记录本身没有独立身份，省一列与一个索引，
-- 且「不可重复」由主键强制，无需依赖调用方先查后插。
CREATE TABLE likes (
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id    BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- 主键前缀是 user_id，按帖子查点赞者与计数需要独立的帖子维度索引。
CREATE INDEX likes_post_idx ON likes (post_id);

-- 收藏：结构与点赞一致，但读取方向相反——收藏列表按用户、时间倒序。
CREATE TABLE bookmarks (
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id    BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX bookmarks_user_idx ON bookmarks (user_id, created_at DESC);

-- 评论：单层结构，不设 parent_id（FR-INT-07 明确 v1.0 不做嵌套回复）。
-- author_id 不级联删除：用户注销走软删除，其历史评论保留并署名「已注销用户」。
CREATE TABLE comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  author_id  BIGINT NOT NULL REFERENCES users (id),
  body       TEXT NOT NULL,
  status     VARCHAR(16) NOT NULL DEFAULT 'published',
  -- 为「赞数 + 时间」综合排序预留；v1.1 未开放评论点赞，当前恒为 0，排序按 created_at。
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE comments
  ADD CONSTRAINT comments_status_valid
  CHECK (status IN ('published', 'removed', 'deleted'));
-- 与 POST_BODY_MAX 同源：服务层上限 1000 字符，此处兜底防止绕过服务层写入超长内容。
ALTER TABLE comments
  ADD CONSTRAINT comments_body_length
  CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000);
ALTER TABLE comments
  ADD CONSTRAINT comments_like_count_nonnegative CHECK (like_count >= 0);
-- 与 posts 同一套软删除语义：有删除时间即必须是 deleted 状态。
ALTER TABLE comments
  ADD CONSTRAINT comments_deleted_consistent
  CHECK ((deleted_at IS NULL) = (status <> 'deleted'));

-- 评论列表按时间倒序游标分页，只覆盖可见评论。
CREATE INDEX comments_post_idx
  ON comments (post_id, created_at DESC, id DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- 通知：只由服务层显式写入（评论事件），不做数据库触发器。
-- actor_id 用 SET NULL：触发者注销后，通知保留但署名降级，不让接收者的记录凭空消失。
CREATE TABLE notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        VARCHAR(32) NOT NULL,
  actor_id    BIGINT REFERENCES users (id) ON DELETE SET NULL,
  target_type VARCHAR(16),
  target_id   BIGINT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_valid
  CHECK (type IN ('comment', 'like', 'mention', 'message', 'system'));
ALTER TABLE notifications
  ADD CONSTRAINT notifications_target_type_valid
  CHECK (target_type IS NULL OR target_type IN ('post', 'comment', 'message'));
-- 目标类型与目标 ID 必须成对出现，避免出现「知道有人评论了但不知道评论了哪篇」的孤儿通知。
ALTER TABLE notifications
  ADD CONSTRAINT notifications_target_paired
  CHECK ((target_type IS NULL) = (target_id IS NULL));

-- 通知列表：按接收者与时间倒序；未读计数在其上再过滤 is_read。
CREATE INDEX notifications_user_idx
  ON notifications (user_id, created_at DESC, id DESC);

CREATE INDEX notifications_unread_idx
  ON notifications (user_id, is_read, created_at DESC)
  WHERE is_read = false;
