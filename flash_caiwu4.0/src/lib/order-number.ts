// 订单号生成：SO-YYYYMMDD-001 / PO-YYYYMMDD-001（当天序号递增）
// 注意：不与 utils.ts 的 generateOrderNo（时间戳+随机串）冲突，该函数被测试断言格式

// 格式化日期为 YYYYMMDD
export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// 根据前缀、日期与当天序号构建订单号
export function buildOrderNo(prefix: "SO" | "PO", date: Date, seq: number): string {
  return `${prefix}-${formatDateStr(date)}-${String(seq).padStart(3, "0")}`;
}

// 从已有订单号解析当天序号，未匹配返回 0
// 例如 parseOrderSeq("SO-20260803-007", "SO", "20260803") => 7
export function parseOrderSeq(
  orderNo: string,
  prefix: string,
  dateStr: string
): number {
  const match = orderNo.match(new RegExp(`^${prefix}-${dateStr}-(\\d+)$`));
  if (!match) return 0;
  return parseInt(match[1], 10);
}

// 订单号当天最大序号（用于在事务内计算下一个序号）
export const MAX_DAILY_SEQ = 999;
