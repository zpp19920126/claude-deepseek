import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";
import { SalesDetailEdit } from "@/components/features/sales-detail-edit";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

// 状态徽标颜色映射（复用配送单状态）
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  delivered: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

function StatusBadge({ status }: { status: string }) {
  const label =
    (DELIVERY_ORDER_STATUS as Record<string, string>)[status] || status;
  const cls = STATUS_BADGE[status] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

export default async function SalesDetailPage({ params }: PageProps) {
  const { id } = await params;
  const salesId = Number(id);

  if (Number.isNaN(salesId)) {
    notFound();
  }

  const order = await prisma.salesOrder.findUnique({
    where: { id: salesId },
    include: {
      customer: {
        select: { id: true, name: true, code: true, shortName: true },
      },
      deliveryOrder: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          remark: true,
          createdAt: true,
          items: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
              reservedUnit: { select: { id: true, name: true } },
              deliveryUnit: { select: { id: true, name: true } },
            },
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // 聚合金额计算
  const orderAmount = order.deliveryOrder.items.reduce(
    (s, it) => s + it.receivedQuantity * it.unitPrice,
    0
  );
  const reservedAmount = order.deliveryOrder.items.reduce(
    (s, it) => s + it.reservedQuantity * it.unitPrice,
    0
  );
  const deliveryAmount = order.deliveryOrder.items.reduce(
    (s, it) => s + it.deliveryQuantity * it.unitPrice,
    0
  );

  return (
    <div className="space-y-6">
      {/* 页头：返回 + 销售单编码 */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/sales"
            className="text-sm text-text-muted hover:text-primary inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回销售单列表
          </Link>
          <h1 className="text-xl font-bold text-text mt-2 flex items-center gap-3">
            <span className="font-mono">{order.salesNo}</span>
            <StatusBadge status={order.deliveryOrder.status} />
          </h1>
        </div>
        <Link
          href="/sales/print"
          className="text-sm text-primary hover:underline"
        >
          打印此列表
        </Link>
      </div>

      {/* 基本信息卡片 */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="font-semibold text-text mb-4">基本信息</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-text-muted">销售单编码</p>
            <p className="text-text font-mono mt-1">{order.salesNo}</p>
          </div>
          <div>
            <p className="text-text-muted">客户编码</p>
            <p className="text-text mt-1">{order.customer?.code || "-"}</p>
          </div>
          <div>
            <p className="text-text-muted">客户名称</p>
            <p className="text-text mt-1">{order.customer?.name || "-"}</p>
          </div>
          <div>
            <p className="text-text-muted">客户简称</p>
            <p className="text-text mt-1">{order.customer?.shortName || "-"}</p>
          </div>
          <div>
            <p className="text-text-muted">配送单号</p>
            <p className="text-text font-mono mt-1">
              {order.deliveryOrder?.orderNo || "-"}
            </p>
          </div>
          <div>
            <p className="text-text-muted">状态</p>
            <div className="mt-1">
              <StatusBadge status={order.deliveryOrder.status} />
            </div>
          </div>
          <div>
            <p className="text-text-muted">创建时间</p>
            <p className="text-text mt-1">{formatDateTime(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-text-muted">更新时间</p>
            <p className="text-text mt-1">{formatDateTime(order.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* 金额汇总卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted">单据金额</p>
          <p className="text-2xl font-bold text-text mt-2">
            {formatCurrency(orderAmount)}
          </p>
          <p className="text-xs text-text-muted mt-1">实收数量 × 单价</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted">预定金额</p>
          <p className="text-2xl font-bold text-text mt-2">
            {formatCurrency(reservedAmount)}
          </p>
          <p className="text-xs text-text-muted mt-1">预定数量 × 单价</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted">配送金额</p>
          <p className="text-2xl font-bold text-text mt-2">
            {formatCurrency(deliveryAmount)}
          </p>
          <p className="text-xs text-text-muted mt-1">配送数量 × 单价</p>
        </div>
      </div>

      {/* 配送单明细表格 */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-text">配送单明细</h2>
          <p className="text-xs text-text-muted mt-1">
            以下为关联配送单 {order.deliveryOrder?.orderNo} 的商品明细
          </p>
        </div>
        {order.deliveryOrder.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-muted">
            暂无配送单明细数据
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg">
                  <th className="px-4 py-3 text-left font-medium text-text-muted">序号</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">商品编码</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">商品名称</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">预定单位</th>
                  <th className="px-4 py-3 text-right font-medium text-text-muted">预定数量</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">配送单位</th>
                  <th className="px-4 py-3 text-right font-medium text-text-muted">配送数量</th>
                  <th className="px-4 py-3 text-right font-medium text-text-muted">实收数量</th>
                  <th className="px-4 py-3 text-right font-medium text-text-muted">单价</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.deliveryOrder.items.map((it, index) => (
                  <tr key={it.id} className="hover:bg-bg transition">
                    <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-text">{it.product?.sku || "-"}</td>
                    <td className="px-4 py-3 text-text">{it.product?.name || "-"}</td>
                    <td className="px-4 py-3 text-text">{it.reservedUnit?.name || "-"}</td>
                    <td className="px-4 py-3 text-right text-text">{it.reservedQuantity}</td>
                    <td className="px-4 py-3 text-text">{it.deliveryUnit?.name || "-"}</td>
                    <td className="px-4 py-3 text-right text-text">{it.deliveryQuantity}</td>
                    <td className="px-4 py-3 text-right text-text font-medium">{it.receivedQuantity}</td>
                    <td className="px-4 py-3 text-right text-text">{formatCurrency(it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 备注编辑卡片 */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="font-semibold text-text mb-4">备注</h2>
        <SalesDetailEdit salesId={order.id} initialRemark={order.remark} />
      </div>
    </div>
  );
}
