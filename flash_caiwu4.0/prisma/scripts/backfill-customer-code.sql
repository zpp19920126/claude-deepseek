-- ========================================================
-- Customer 表新增 code/shortName 字段的数据回填脚本
-- ========================================================
-- 背景：
--   schema.prisma 为 Customer 新增了 code（NOT NULL UNIQUE）和
--   shortName（NULLABLE）字段。对已有数据的库直接执行
--   `npx prisma db push` 会因「已有行 code 为 NULL 无法建唯一
--   索引」而失败。
--
-- 用法（在项目根目录执行）：
--   sqlite3 prisma/dev.db < prisma/scripts/backfill-customer-code.sql
--   npx prisma db push
--   npx prisma generate
--
-- 说明：
--   1. 本脚本幂等：ALTER TABLE ADD COLUMN 在 SQLite 中若列已存在
--      会报错，可忽略；UPDATE 只影响 code 为空的行，重复执行安全。
--   2. code 生成规则：K + 三位序号（按 id 升序），与 seed.ts 中
--      的 K001-K004 保持一致。已有 code 的行不会被覆盖。
--   3. shortName 沿用 name 前 4 字作为兜底；如已有值则不覆盖。
-- ========================================================

-- 1. 新增列（若已存在会报错，可忽略）
ALTER TABLE Customer ADD COLUMN code TEXT;
ALTER TABLE Customer ADD COLUMN shortName TEXT;

-- 2. 回填 code：仅对 code 为空或 NULL 的行按 id 顺序生成
UPDATE Customer
SET code = 'K' || printf('%03d', id)
WHERE code IS NULL OR code = '';

-- 3. 回填 shortName：仅对 shortName 为空的行，取 name 前 4 字
UPDATE Customer
SET shortName = substr(name, 1, 4)
WHERE shortName IS NULL OR shortName = '';

-- 4. 创建唯一索引（若已存在会报错，可忽略）
CREATE UNIQUE INDEX IF NOT EXISTS Customer_code_key ON Customer(code);

-- 5. 验证结果
SELECT id, code, name, shortName, phone, contact FROM Customer ORDER BY id;
