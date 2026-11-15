-- 迁移 019：等级历史最高（M5.5-S2）
-- 对应 IMPLEMENTATION-PLAN.md M5.5-S2；PRD.md §4.10 FR-ACH-05；ARCHITECTURE.md §7.3
-- 依赖：001 已建立 users。
-- 回滚影响：单列新增，回滚为 DROP COLUMN；等级本身是派生值可重算，但「历史最高」会丢失，
--   曾经达到段位的成员会按当前经验重新落档（即可能掉级）。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

-- 等级本身不落库：它由 shared/metrics 的七个指标现算（与成就同一套口径），
-- 存一份就等于给自己造一个必须同步的副本。
-- 这一列只记「历史最高等级」，用来兑现「只升不降」——取消点赞、删掉旧帖都会让现算经验下降，
-- 若只看现算值，攒了半年的等级会因为删了一篇帖子消失，对小社区是纯负收益。
ALTER TABLE users ADD COLUMN top_level SMALLINT NOT NULL DEFAULT 1;

-- 上限与 level.rules.ts 的 MAX_LEVEL 必须一致：库层拦住写坏的等级，
-- 不让一个 999 级出现在页面上。下限 1 而非 0——等级从 L1 起，不存在「零级」。
ALTER TABLE users ADD CONSTRAINT users_top_level_range CHECK (top_level BETWEEN 1 AND 50);
