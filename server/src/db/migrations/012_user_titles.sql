-- 迁移 012：用户头衔（M5.5-S1 站长账号头衔预览）
-- 对应 ARCHITECTURE.md §7.3 用户扩展 / IMPLEMENTATION-PLAN.md M5.5-S1
-- 回滚影响：仅新增一列与约束，删除需以补偿迁移实现；回填只改 admin 行，可逆。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

-- 头衔为预设目录，仅允许社区长 / 创始人 / 管理员三种；
-- 颜色与语义在服务端常量与前端设计令牌中固定，不随用户存储，防止自定义颜色。
ALTER TABLE users ADD COLUMN titles TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE users ADD CONSTRAINT users_titles_check
  CHECK (titles <@ ARRAY['community_leader', 'founder', 'admin']::text[]);

-- 回填：站点管理员默认携带全部三个头衔，可由「设置」自行开关（见 M5.5-S1-T2）。
UPDATE users
   SET titles = ARRAY['community_leader', 'founder', 'admin']
 WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');
