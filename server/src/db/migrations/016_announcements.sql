-- 迁移 016：社区公告入库（运营通知与当前状态）
-- 对应 ARCHITECTURE.md §6.2「当前已落地：社区公告」；IMPLEMENTATION-PLAN.md M6-S0
-- 依赖：001 已建立 users 表（created_by / updated_by 外键）。
-- 回滚影响：表为新增，回滚须以补偿迁移实现；已发布的运营通知会随之消失，
--           删除前请先由运营者导出内容（公告正文是人工撰写、代码里没有副本）。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

-- 公告分三层（见 docs/ARCHITECTURE.md §6.2）：
--   1. 发布记录：功能上线说明，属历史档案，随代码版本走（announcements.doc.ts），不进本表；
--   2. 当前状态：现在能用什么、还差什么，属活文档，需随时改写 —— 进本表，单例置顶；
--   3. 运营通知：维护、规则提醒、临时声明 —— 进本表，可草稿、可置顶、可软删除。
-- 把三者塞进同一个列表、同一种结构，必然出现「改状态 = 改历史」，本表只承担后两层。
CREATE TABLE announcements (
  id           BIGSERIAL PRIMARY KEY,
  -- 复用前端既有的四类标签，另加 notice（运营通知），供「维护 / 提醒」这类不属于功能发布的条目使用。
  kind         VARCHAR(16) NOT NULL,
  title        VARCHAR(120) NOT NULL,
  -- 一句话摘要：右栏卡片只显示这一段，必须能独立读懂。
  summary      TEXT NOT NULL,
  -- 正文：每行一条要点，前端按行拆成列表。不存 HTML，避免富文本带来的消毒与 XSS 面。
  body         TEXT NOT NULL DEFAULT '',
  is_pinned    BOOLEAN NOT NULL DEFAULT false,
  status       VARCHAR(16) NOT NULL DEFAULT 'draft',
  -- 发布时间与状态严格绑定：发布必须有时间，草稿必须没有。
  -- 这样「草稿被误当成已发布显示出来」在数据库层就不可能发生。
  published_at TIMESTAMPTZ,
  created_by   BIGINT REFERENCES users (id),
  updated_by   BIGINT REFERENCES users (id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  CONSTRAINT announcements_kind_valid
    CHECK (kind IN ('feature', 'fix', 'rule', 'status', 'notice')),
  CONSTRAINT announcements_status_valid
    CHECK (status IN ('draft', 'published')),
  CONSTRAINT announcements_published_consistent
    CHECK ((status = 'published') = (published_at IS NOT NULL)),
  CONSTRAINT announcements_title_nonempty CHECK (btrim(title) <> ''),
  CONSTRAINT announcements_summary_nonempty CHECK (btrim(summary) <> '')
);

-- 公开读取：置顶优先，再按发布时间倒序。部分索引让「已发布且未删除」的扫描不碰草稿。
CREATE INDEX announcements_public_idx
  ON announcements (is_pinned DESC, published_at DESC, id DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- 管理列表：草稿也要看得到，按最后修改倒序。
CREATE INDEX announcements_admin_idx
  ON announcements (updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;

-- 种子：把原先写死在代码常量里的「当前进度与已知问题」搬进本表。
-- 它不是发布记录而是活文档，此前每加一个功能都要改代码 + 发版才能更新，
-- 导致公告长期滞后、甚至自相矛盾（M5 交付后旧公告仍写「私信仍在开发中」）。
-- created_by 留空表示系统初始内容，由运营者之后接管维护。
INSERT INTO announcements (kind, title, summary, body, is_pinned, status, published_at)
VALUES (
  'status',
  '当前进度与已知问题',
  '站点可用。私信、搜索、成就时间线、每周热门与数据导出均已交付，暂无公示的未完成项。',
  E'可用：注册登录、发帖配图、话题分类、三种信息流、全站搜索、站内私信（留言式）、个人主页与设置、点赞收藏评论、我的收藏列表、我的点赞列表、配图看大图、通知中心、一人一码邀请制、自助改密、自行删除自己发布的帖子、举报与申诉最小闭环、成就时间线与每周热门、数据导出（Markdown / JSON）。\n尚未开始：经验 / 签到 / 等级，完整治理后台与审核日志，验收与性能加固。\n私信没有实时推送，对方刷新或下次打开时可见；也不会有未读红点。\n每周热门只排帖子、不排人，最多五条；不做排行榜、不做签到、不显示「还差几个」的进度。\n导出的文件是「带走」，不是「传回来」：本站没有导入功能，整站恢复由运营者用数据库备份处理。',
  true,
  'published',
  now()
);
