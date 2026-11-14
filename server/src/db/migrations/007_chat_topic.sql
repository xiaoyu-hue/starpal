-- 迁移 007：新增内置话题「闲聊」
-- 背景：003 内置的九个话题均带主题倾向，缺少「不设主题、随手一句」的低门槛入口。
--       实际使用中，新用户的第一条内容常是打招呼或日常碎念，被迫塞进「生活 / 其他兴趣」会削弱分类信号。
-- 归位：sort_order = 0，排在所有主题话题之前，作为社区入口区。
-- 回滚影响：删除该行不牵连帖子以外的数据；若已有帖子挂在 chat 下，删除话题会因外键（posts.topic_id NO ACTION）失败，
--           须先把帖子迁移到其他话题或软删除话题（deleted_at），不做级联删除。
-- 幂等说明：生产库可能已由运维手工插入同一 slug；此处用 ON CONFLICT DO NOTHING，重复执行不报错也不覆盖既有内容。
--           与 003 的写法不同，是因为 003 属建表初始化，重复执行本就该暴露问题；本条属数据补充，容忍已存在。

INSERT INTO topics (slug, name_zh, name_en, description, icon, sort_order, is_demo)
VALUES (
  'chat',
  '闲聊',
  'Chit-Chat',
  '不设主题的轻松闲聊：打个招呼、说说今天、随手一句都行。',
  'message-circle',
  0,
  false
)
ON CONFLICT (slug) DO NOTHING;
