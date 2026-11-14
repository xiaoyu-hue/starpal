-- 迁移 010：「我的点赞」列表的读取方向补索引。
-- 背景：005 里 likes 只建了 likes_post_idx (post_id)，服务于「按帖子查点赞者 / 计数」。
-- 「我的点赞」按 (user_id, created_at DESC) 读取，主键 (user_id, post_id) 只能过滤用户、
-- 无法直接满足按时间排序；与 005 的 bookmarks_user_idx 对称补一条，避免列表随数据增长
-- 退化为「取出该用户全部点赞再排序」。纯新增索引，不改表结构与历史数据。
-- 幂等说明：由迁移执行器按 version 控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。
CREATE INDEX likes_user_idx ON likes (user_id, created_at DESC);
