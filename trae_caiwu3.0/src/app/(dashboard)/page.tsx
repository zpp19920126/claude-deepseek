import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS, PURCHASE_ORDER_STATUS } from "@/types";

export default async function DashboardPage() {
  // 获取今日日期范围
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // 并行查询统计数据
  const [
    todaySales,
    todayPurchases,
    lowStockProducts,
    recentSales,
    recentPurchases,
    totalProducts,
    totalCustomers,
    totalSuppliers,
  ] = await Promise.all([
    // 今日销售（统计销售单数量；金额需通过配送单明细聚合，此处简化为计数）
    prisma.salesOrder.count({
      where: {
        createdAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    // 今日进货
    prisma.purchaseOrder.aggregate({
      where: {
        createdAt: { gte: todayStart, lt: todayEnd },
        status: { not: "cancelled" },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // 库存预警商品
    prisma.product.findMany({
      where: {
        stock: { lte: prisma.product.fields.minStock },
        status: "active",
      },
      include: { unit: true },
      take: 5,
      orderBy: { stock: "asc" },
    }),
    // 最近销售单
    prisma.salesOrder.findMany({
      include: {
        customer: { select: { id: true, name: true } },
        deliveryOrder: {
          select: {
            orderNo: true,
            status: true,
            items: { select: { deliveryQuantity: true, unitPrice: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // 最近进货单
    prisma.purchaseOrder.findMany({
      include: { supplier: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // 商品总数
    prisma.product.count({ where: { status: "active" } }),
    // 客户总数
    prisma.customer.count(),
    // 供应商总数
    prisma.supplier.count(),
  ]);

  const stats = [
    {
      label: "今日销售单",
      value: todaySales.toString(),
      sub: "笔销售单",
      icon: "💰",
      color: "bg-primary-lighter text-primary-dark",
    },
    {
      label: "今日进货额",
      value: formatCurrency(todayPurchases._sum.totalAmount || 0),
      sub: `${todayPurchases._count} 笔订单`,
      icon: "📦",
      color: "bg-info-light text-info",
    },
    {
      label: "在售商品",
      value: totalProducts.toString(),
      sub: "种商品",
      icon: "🥬",
      color: "bg-warning-light text-warning",
    },
    {
      label: "客户/供应商",
      value: `${totalCustomers}/${totalSuppliers}`,
      sub: "客户/供应商",
      icon: "👥",
      color: "bg-primary-lighter text-primary-dark",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-text">仪表盘</h1>
        <p className="text-sm text-text-muted mt-1">
          {today.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-text mt-2">{stat.value}</p>
                <p className="text-xs text-text-muted mt-1">{stat.sub}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近销售单 */}
        <div className="bg-surface rounded-xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-text">最近销售单</h2>
            <Link href="/sales" className="text-sm text-primary hover:underline">
              查看全部
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentSales.length === 0 ? (
              <p className="p-5 text-center text-sm text-text-muted">暂无销售单</p>
            ) : (
              recentSales.map((order) => {
                const amount = order.deliveryOrder.items.reduce(
                  (s, it) => s + it.deliveryQuantity * it.unitPrice,
                  0
                );
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 hover:bg-bg transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {order.customer.name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {order.salesNo} · {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-sm font-semibold text-text">
                        {formatCurrency(amount)}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {DELIVERY_ORDER_STATUS[order.deliveryOrder.status as keyof typeof DELIVERY_ORDER_STATUS] || order.deliveryOrder.status}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 最近进货单 */}
        <div className="bg-surface rounded-xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-text">最近进货单</h2>
            <Link href="/purchases" className="text-sm text-primary hover:underline">
              查看全部
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentPurchases.length === 0 ? (
              <p className="p-5 text-center text-sm text-text-muted">暂无进货单</p>
            ) : (
              recentPurchases.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 hover:bg-bg transition">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {order.supplier.name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {order.orderNo} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-semibold text-text">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {PURCHASE_ORDER_STATUS[order.status as keyof typeof PURCHASE_ORDER_STATUS] || order.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 库存预警 */}
      <div className="bg-surface rounded-xl border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-text">
            库存预警
            {lowStockProducts.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger-light text-danger">
                {lowStockProducts.length}
              </span>
            )}
          </h2>
          <Link href="/products" className="text-sm text-primary hover:underline">
            查看全部商品
          </Link>
        </div>
        <div className="divide-y divide-border">
          {lowStockProducts.length === 0 ? (
            <p className="p-5 text-center text-sm text-text-muted">库存充足，暂无预警</p>
          ) : (
            lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 hover:bg-bg transition">
                <div>
                  <p className="text-sm font-medium text-text">{product.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">SKU: {product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-danger">
                    {product.stock} {product.unit.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    最低库存: {product.minStock} {product.unit.name}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
