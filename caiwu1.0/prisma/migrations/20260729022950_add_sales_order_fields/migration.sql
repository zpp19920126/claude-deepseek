-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN "content" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN "department" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN "handler" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN "receiptAccount" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN "receiptAmount" REAL;
ALTER TABLE "sales_orders" ADD COLUMN "receiptDate" DATETIME;
ALTER TABLE "sales_orders" ADD COLUMN "selfNo" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN "warehouse" TEXT;
