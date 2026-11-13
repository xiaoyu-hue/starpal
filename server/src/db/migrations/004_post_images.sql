-- 迁移 004：帖子图片元数据与二进制
-- 对应 ARCHITECTURE.md §7.3 / §8（ADR-014：二进制存 PostgreSQL）；IMPLEMENTATION-PLAN.md M3-S1-T2
-- 依赖：003 已建立 posts 表。
-- 回滚影响：两张表均为新增；回滚须以新增补偿迁移实现（DROP 会造成图片不可恢复）。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

-- 图片元数据：与帖子分离，列表与详情查询不触碰二进制字段。
CREATE TABLE post_images (
  id            BIGSERIAL PRIMARY KEY,
  post_id       BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  -- 随机标识，等价于「随机文件名」；二进制实际存于 image_blobs，此列用于对外引用与缓存键。
  storage_key   VARCHAR(64) NOT NULL UNIQUE,
  -- 仅用于展示与导出，不参与任何落盘或路径拼接。
  original_name TEXT NOT NULL,
  -- 由重编码后的真实格式判定，不采信客户端声明。
  mime_type     VARCHAR(64) NOT NULL,
  width         INT NOT NULL,
  height        INT NOT NULL,
  byte_size     INT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE post_images
  ADD CONSTRAINT post_images_mime_allowed
  CHECK (mime_type IN ('image/webp', 'image/jpeg', 'image/png', 'image/avif'));
ALTER TABLE post_images
  ADD CONSTRAINT post_images_dimensions_positive
  CHECK (width > 0 AND height > 0 AND byte_size > 0);
ALTER TABLE post_images
  ADD CONSTRAINT post_images_storage_key_format
  CHECK (storage_key ~ '^[a-f0-9]{32}$');

-- 详情页按 sort_order 取图；同一帖子内顺序唯一，避免前端排序不确定。
CREATE INDEX post_images_post_idx ON post_images (post_id, sort_order);
ALTER TABLE post_images
  ADD CONSTRAINT post_images_post_sort_unique UNIQUE (post_id, sort_order);

-- 二进制主体：与元数据一对一，随元数据删除级联清理，不产生孤儿。
-- 选 BYTEA 而非 large object：数据量小、随事务提交、随 pg_dump 一并备份。
CREATE TABLE image_blobs (
  image_id   BIGINT PRIMARY KEY REFERENCES post_images (id) ON DELETE CASCADE,
  data       BYTEA NOT NULL,
  -- 内容摘要：用于去重判断与缓存键，不承载安全语义。
  sha256     CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX image_blobs_sha_idx ON image_blobs (sha256);
