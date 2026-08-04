import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PURCHASE_ORDER_STATUS } from "@/types";
import { PurchaseDetailEdit } from "@/components/features/purchase-detail-edit";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

function StatusBadge({ status }: { status: string }) {
  const label =
    (PURCHASE_ORDER_STATUS as Record<string, string>)[status] || status;
  const cls = STATUS_BADGE[status] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

export default async function PurchaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const purchaseId = Number(id);

  if (Number.isNaN(purchaseId)) {
    notFound();
  }

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseId },
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true } },
          reservedUnit: { select: { id: true, name: true } },
          receivedUnit: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const reservedAmount = order.items.reduce(
    (s, it) => s + it.reservedQuantity * it.unitPrice,
    0
  );
  const receivedAmount = order.items.reduce(
    (s, it) => s + it.receivedQuantity * it.unitPrice,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/purchases"
            className="text-sm text-text-muted hover:text-primary inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回进货单列表
          </Link>
          <h1 className="text-xl font-bold text-text mt-2 flex items-center gap-3">
            <span className="font-mono">{order.orderNo}</span>
            <StatusBadge status={order.status} />
          </h1>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="font-semibold text-text mb-4">基本信息</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-text-muted">进货单编号</p>
            <p className="text-text font-mono mt-1">{order.orderNo}</p>
          </div>
          <div>
            <p className="text-text-muted">供应商编码</p>
            <p className="text-text mt-1">{order.supplier?.code || "-"}</p>
          </div>
          <div>
            <p className="text-text-muted">供应商名称</p>
            <p className="text-text mt-1">{order.supplier?.name || "-"}</p>
          </div>
          <div>
            <p className="text-text-muted">状态</p>
            <div className="mt-1">
              <StatusBadge status={order.status} />
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

      {/* 金额汇总 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted">预定金额</p>
          <p className="text-2xl font-bold text-text mt-2">
            {formatCurrency(reservedAmount)}
          </p>
          <p className="text-xs text-text-muted mt-1">预定数量 × 单价</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted">实收金额</p>
          <p className="text-2xl font-bold text-text mt-2">
            {formatCurrency(receivedAmount)}
          </p>
          <p className="text-xs text-text-muted mt-1">实收数量 × 单价</p>
        </div>
      </div>

      {/* 明细表格 */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-text">商品明细</h2>
        </div>
        {order.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-muted">暂无明细数据</p>
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
                  <th className="px-4 py-3 text-left font-medium text-text-muted">实收单位</th>
                  <th className="px-4 py-3 text-right font-medium text-text-muted">实收数量</th>
                  <th className="px-4 py-3 text-right font-medium text-text-muted">单价</th>
                  <th className="px-4 py-3 text-right font-medium text-text-muted">小计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((it, index) => (
                  <tr key={it.id} className="hover:bg-bg transition">
                    <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-text">{it.product?.sku || "-"}</td>
                    <td className="px-4 py-3 text-text">{it.product?.name || "-"}</td>
                    <td className="px-4 py-3 text-text">{it.reservedUnit?.name || "-"}</td>
                    <td className="px-4 py-3 text-right text-text">{it.reservedQuantity}</td>
                    <td className="px-4 py-3 text-text">{it.receivedUnit?.name || "-"}</td>
                    <td className="px-4 py-3 text-right text-text font-medium">{it.receivedQuantity}</td>
                    <td className="px-4 py-3 text-right text-text">{formatCurrency(it.unitPrice)}</td>
                    <td className="px-4 py-3 text-right text-text">
                      {formatCurrency(it.receivedQuantity * it.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 备注编辑 */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="font-semibold text-text mb-4">备注</h2>
        <PurchaseDetailEdit purchaseId={order.id} initialRemark={order.remark} />
      </div>
    </div>
  );
}
