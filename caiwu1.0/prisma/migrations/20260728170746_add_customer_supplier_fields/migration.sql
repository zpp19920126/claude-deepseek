-- AlterTable
ALTER TABLE "customers" ADD COLUMN "email" TEXT;
ALTER TABLE "customers" ADD COLUMN "mobile" TEXT;
ALTER TABLE "customers" ADD COLUMN "pinyin" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN "email" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "mobile" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "orderStartTime" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "orderStopTime" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "pinyin" TEXT;
