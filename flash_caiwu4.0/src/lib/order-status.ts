// 订单状态流转矩阵（纯函数，可单测）
// 销售单：pending(待确认) → confirmed(已确认) → delivered(已配送) → paid(已收款)
//         pending/confirmed → cancelled(已取消)，cancelled 为终态
// 进货单：pending(待收货) → received(已入库)；pending → cancelled(已取消)
//         received/cancelled 为终态

export const SALES_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: ["paid"],
  paid: [],
  cancelled: [],
};

export const PURCHASE_TRANSITIONS: Record<string, string[]> = {
  pending: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

// 判断状态流转是否合法
export function canTransition(
  type: "sales" | "purchase",
  from: string,
  to: string
): boolean {
  const matrix = type === "sales" ? SALES_TRANSITIONS : PURCHASE_TRANSITIONS;
  const allowed = matrix[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
