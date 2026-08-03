import { PrismaClient } from "@prisma/client";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * 生成销售配送单编号：SO + YYYYMMDD + 4位当日序号
 * 在事务内调用，查询当日已有单据数 +1；并发冲突由调用方捕获 P2002 重试
 */
export async function generateDeliveryOrderNo(
  tx: TransactionClient
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  const prefix = `SO${dateStr}`;
  const count = await tx.deliveryOrder.count({
    where: { orderNo: { startsWith: prefix } },
  });

  const seq = (count + 1).toString().padStart(4, "0");
  return `${prefix}${seq}`;
}
