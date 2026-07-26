const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "待付款", color: "bg-orange-100 text-orange-700" },
  PAID: { label: "已支付", color: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "已发货", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "已完成", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "已取消", color: "bg-gray-100 text-gray-500" },
};

/**
 * 订单状态标签
 */
export function OrderStatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] || { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${info.color}`}>
      {info.label}
    </span>
  );
}
