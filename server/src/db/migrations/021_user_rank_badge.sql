-- 迁移 021：段位徽标（M5.5 补充：用户可佩戴已解锁的段位）
-- 对应 PRD FR-ACH-05 / ARCHITECTURE §7.3 用户扩展
-- 回滚影响：仅新增一列与约束，删除需以补偿迁移实现；默认 NULL 表示「不戴」，不改变任何现有用户的外观。
-- 幂等说明：由迁移执行器按 version 幂等控制，本文件内不使用 IF NOT EXISTS 以暴露意外重复执行。

-- 为什么只存「戴哪一个」，不存「解锁了哪些」：
-- 等级只升不降（users.top_level 是历史最高），所以「已解锁段位」恒等于 top_level 覆盖到的所有段位，
-- 是可派生的。再建一张表记录解锁，就要在每次晋级时同步写入，多一处可能与 top_level 分叉的真源。
-- 颜色与中文名不落库：它们属于表现层，跟着 rank.rules 的枚举走，避免运营改文案时出现历史脏数据。
ALTER TABLE users ADD COLUMN equipped_rank TEXT;

-- NULL = 不佩戴（默认）。非空时只允许五个段位键，与 level.rules.ts 的 RANKS 同一套枚举。
-- 不校验「该段位是否已解锁」——那取决于 top_level，属于业务规则，交给服务层判断；
-- 数据库这层只保证「不会存进一个不存在的段位」。
ALTER TABLE users ADD CONSTRAINT users_equipped_rank_check
  CHECK (equipped_rank IS NULL OR equipped_rank IN ('newcomer', 'starter', 'regular', 'friend', 'veteran'));
