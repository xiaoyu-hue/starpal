-- 迁移 015：移除 achievements.icon（M5-S2 修订）
-- 对应 PRD §4.10 FR-ACH-01；IMPLEMENTATION-PLAN.md M5-S2-T1 的后续修正。
-- 依赖：014 已建立 achievements。
-- 回滚影响：该列只有 9 行固定种子值（'pen-line' 这类前端图标库内部键名），
--   无用户数据依赖；回滚须以补偿迁移重新加列并回填，不影响任何解锁记录。
--
-- 为什么要删：
-- 014 把「用哪个图标」存进了数据库，值为 'pen-line' / 'message-circle' / 'heart' 等
-- lucide 内部键名——这是表现层实现细节，不该由数据承担。更实际的问题是：
-- 这批键名指向的线性图标已被站内导航与按钮大量复用（笔＝发帖、气泡＝评论数、
-- 心＝点赞、纸飞机＝发送、层叠＝话题），徽章与「这里可以点」在视觉上无法区分。
-- 改为前端按 code（'first_post'、'first_comment'…）自绘专属印章，语义身份本就是 code。
-- 因此 icon 列既存错了东西，也存了不必要的东西，直接移除而非留着空转。

ALTER TABLE achievements DROP COLUMN icon;
