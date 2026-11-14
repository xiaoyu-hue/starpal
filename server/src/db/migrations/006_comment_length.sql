-- 迁移 006：评论正文上限 1000 → 2000 字符（Unicode 码点）
-- 背景：005 的上限按短内容社区（小红书正文 1000 字符）设定，与本项目「帖子正文
-- 支持 20000 字符」的长文定位不匹配，一段完整论证常被截断在千字。
-- 口径：char_length 在 PostgreSQL 中按字符（码点）计，emoji 算 1；服务层必须用
-- 同一口径（码点）校验，不得使用 JavaScript 的 UTF-16 length，否则 emoji 会算 2。
-- 依据：Discourse 默认 32000（论坛长帖）、Reddit 评论 10000（英文长评）、
-- 微博正文 2000；本项目取 2000，与中文社区长评上限一致，且为正文上限的十分之一。
-- 回滚影响：收紧约束时若已有超长评论，迁移会失败；届时须先处置数据再回滚。

ALTER TABLE comments DROP CONSTRAINT comments_body_length;

-- 空白集合必须显式列出：btrim(body) 只裁普通空格，纯换行 / 制表符的评论能绕过
-- 「非空」判定。全角空格等 Unicode 空白由服务层 trim 归一化，此处只兜底常见 ASCII 空白。
ALTER TABLE comments
  ADD CONSTRAINT comments_body_length
  CHECK (char_length(btrim(body, E' \t\n\r\f\v')) BETWEEN 1 AND 2000);

COMMENT ON CONSTRAINT comments_body_length ON comments IS
  '正文 1–2000 字符（Unicode 码点）；与服务层 COMMENT_BODY_MAX 同源';
