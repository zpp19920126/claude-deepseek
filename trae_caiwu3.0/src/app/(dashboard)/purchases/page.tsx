import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PURCHASE_ORDER_STATUS } from "@/types";
import { PurchaseSearchForm } from "@/components/features/purchase-search-form";
import { PurchaseToolbar } from "@/components/features/purchase-toolbar";
import { PurchaseRowActions } from "@/components/features/purchase-row-actions";
import { Table, type Column } from "@/components/ui/table";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

// 状态徽标颜色映射
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default async function PurchasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const pageSize = 20;

  // 多字段搜索
  const where: Prisma.PurchaseOrderWhereInput = {};
  if (params.search) {
    const s = params.search;
    where.OR = [
      { orderNo: { contains: s } },
      { supplier: { OR: [{ name: { contains: s } }, { code: { contains: s } }] } },
      { items: { some: { product: { OR: [{ name: { contains: s } }, { sku: { contains: s } }] } } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
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
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  // 展开为每行一个商品项（与导出页逻辑一致，避免数量与金额不匹配）
  type RowItem = {
    id: number;
    orderNo: string;
    supplierCode: string;
    supplierName: string;
    productSku: string;
    productName: string;
    reservedUnitName: string;
    reservedQuantity: number;
    receivedUnitName: string;
    receivedQuantity: number;
    unitPrice: number;
    reservedAmount: number;
    receivedAmount: number;
    status: string;
    updatedAt: Date;
    index: number;
  };

  const rows: RowItem[] = [];
  let index = (page - 1) * pageSize + 1;
  for (const o of items) {
    if (o.items.length > 0) {
      for (const it of o.items) {
        rows.push({
          id: o.id,
          orderNo: o.orderNo,
          supplierCode: o.supplier.code,
          supplierName: o.supplier.name,
          productSku: it.product.sku,
          productName: it.product.name,
          reservedUnitName: it.reservedUnit.name,
          reservedQuantity: it.reservedQuantity,
          receivedUnitName: it.receivedUnit.name,
          receivedQuantity: it.receivedQuantity,
          unitPrice: it.unitPrice,
          reservedAmount: it.reservedQuantity * it.unitPrice,
          receivedAmount: it.receivedQuantity * it.unitPrice,
          status: o.status,
          updatedAt: o.updatedAt,
          index,
        });
        index++;
      }
    } else {
      rows.push({
        id: o.id,
        orderNo: o.orderNo,
        supplierCode: o.supplier.code,
        supplierName: o.supplier.name,
        productSku: "-",
        productName: "-",
        reservedUnitName: "-",
        reservedQuantity: 0,
        receivedUnitName: "-",
        receivedQuantity: 0,
        unitPrice: 0,
        reservedAmount: 0,
        receivedAmount: 0,
        status: o.status,
        updatedAt: o.updatedAt,
        index,
      });
      index++;
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  const columns: Column<RowItem>[] = [
    {
      key: "index",
      title: "序号",
      width: "48px",
      render: (row) => <span className="text-text-muted">{row.index}</span>,
    },
    {
      key: "orderNo",
      title: "进货单编号",
      render: (row) => (
        <Link
          href={`/purchases/${row.id}`}
          className="font-mono text-primary hover:underline"
        >
          {row.orderNo}
        </Link>
      ),
    },
    {
      key: "supplierCode",
      title: "供应商编码",
      render: (row) => <span className="font-mono">{row.supplierCode}</span>,
    },
    {
      key: "supplierName",
      title: "供应商名称",
      render: (row) => <span>{row.supplierName}</span>,
    },
    {
      key: "productSku",
      title: "商品编码",
      render: (row) => <span className="font-mono">{row.productSku}</span>,
    },
    {
      key: "productName",
      title: "商品名称",
      render: (row) => <span>{row.productName}</span>,
    },
    {
      key: "reservedUnitName",
      title: "预定单位",
      render: (row) => <span>{row.reservedUnitName}</span>,
    },
    {
      key: "reservedQuantity",
      title: "预定数量",
      className: "text-right",
      render: (row) => <span>{row.reservedQuantity}</span>,
    },
    {
      key: "receivedUnitName",
      title: "实收单位",
      render: (row) => <span>{row.receivedUnitName}</span>,
    },
    {
      key: "receivedQuantity",
      title: "实收数量",
      className: "text-right",
      render: (row) => <span className="font-medium">{row.receivedQuantity}</span>,
    },
    {
      key: "unitPrice",
      title: "单价",
      className: "text-right",
      render: (row) => <span>{formatCurrency(row.unitPrice)}</span>,
    },
    {
      key: "status",
      title: "状态",
      render: (row) => {
        const label =
          (PURCHASE_ORDER_STATUS as Record<string, string>)[row.status] ||
          row.status;
        const cls = STATUS_BADGE[row.status] || "bg-gray-100 text-gray-600";
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}
          >
            {label}
          </span>
        );
      },
    },
    {
      key: "updatedAt",
      title: "更新时间",
      render: (row) => (
        <span className="text-text-muted text-xs">
          {formatDateTime(row.updatedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      className: "text-right",
      render: (row) => (
        <PurchaseRowActions
          purchase={{ id: row.id, orderNo: row.orderNo }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">进货管理</h1>
          <p className="text-sm text-text-muted mt-1">
            共 {total} 个进货单，第 {page}/{Math.max(1, totalPages)} 页
          </p>
        </div>
        <PurchaseToolbar />
      </div>

      <PurchaseSearchForm />

      <Table
        columns={columns}
        data={rows}
        emptyText="暂无进货单数据"
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/purchases?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
              className="px-3 py-1.5 rounded border border-border text-sm hover:bg-bg"
            >
              上一页
            </Link>
          )}
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/purchases?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
              className="px-3 py-1.5 rounded border border-border text-sm hover:bg-bg"
            >
              下一页
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
