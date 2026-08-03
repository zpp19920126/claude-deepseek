import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { Table, type Column } from "@/components/ui/table";
import { SalesStatusActions } from "@/components/features/sales-status-actions";
import { SALES_ORDER_STATUS } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SalesDetailPage({ params }: PageProps) {
  const { id } = await params;
  const order = await prisma.salesOrder.findUnique({
    where: { id: Number(id) },
    include: {
      customer: { select: { id: true, name: true, shortName: true, phone: true, address: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: {
          product: {
            select: {
              sku: true,
              name: true,
              unit: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const statusLabel =
    SALES_ORDER_STATUS[order.status as keyof typeof SALES_ORDER_STATUS] ||
    order.status;

  const columns: Column<typeof order.items[number]>[] = [
    {
      key: "sku",
      title: "商品编码",
      render: (row) => <span className="font-mono text-sm">{row.product.sku}</span>,
    },
    {
      key: "name",
      title: "商品名称",
      render: (row) => <span className="font-medium">{row.product.name}</span>,
    },
    {
      key: "unit",
      title: "单位",
      render: (row) => row.product.unit.name,
    },
    {
      key: "quantity",
      title: "数量",
      render: (row) => row.quantity,
    },
    {
      key: "price",
      title: "单价",
      render: (row) => formatCurrency(row.price),
    },
    {
      key: "subtotal",
      title: "金额",
      render: (row) => (
        <span className="font-medium">{formatCurrency(row.subtotal)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">
            销售单 <span className="font-mono">{order.orderNo}</span>
          </h1>
          <p className="text-sm text-text-muted mt-1">
            创建时间：{formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/sales/${order.id}/print`}
            target="_blank"
            className="px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-bg"
          >
            🖨️ 打印
          </Link>
          <Link
            href="/sales"
            className="px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-bg"
          >
            返回列表
          </Link>
        </div>
      </div>

      {/* 单据信息卡 */}
      <div className="bg-surface rounded-xl border border-border p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-text-muted">状态</p>
          <div className="mt-1">
            <StatusBadge status={order.status} label={statusLabel} />
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted">客户</p>
          <p className="mt-1 text-sm font-medium">
            {order.customer.shortName || order.customer.name}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">操作人</p>
          <p className="mt-1 text-sm">{order.user.name}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">合计金额</p>
          <p className="mt-1 text-lg font-bold text-primary">
            {formatCurrency(order.totalAmount)}
          </p>
        </div>
      </div>

      {/* 客户信息（可选显示） */}
      {(order.customer.phone || order.customer.address) && (
        <div className="bg-surface rounded-xl border border-border p-4 text-sm text-text-muted">
          {order.customer.phone && <span>电话：{order.customer.phone}</span>}
          {order.customer.address && (
            <span className="ml-6">地址：{order.customer.address}</span>
          )}
        </div>
      )}

      {/* 商品明细 */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-medium text-text">
          商品明细
        </div>
        <Table
          columns={columns}
          data={order.items}
          rowKey={(row) => row.id}
          emptyText="暂无明细"
        />
        <div className="px-4 py-3 border-t border-border flex justify-end items-center gap-2">
          <span className="text-sm text-text-muted">合计金额</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(order.totalAmount)}
          </span>
        </div>
      </div>

      {/* 备注 */}
      {order.remark && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-text-muted mb-1">备注</p>
          <p className="text-sm text-text">{order.remark}</p>
        </div>
      )}

      {/* 状态操作 */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <p className="text-xs text-text-muted mb-3">状态操作</p>
        <SalesStatusActions
          order={{ id: order.id, orderNo: order.orderNo, status: order.status }}
        />
      </div>
    </div>
  );
}
