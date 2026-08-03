import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";
import { SalesSearchForm } from "@/components/features/sales-search-form";
import { SalesToolbar } from "@/components/features/sales-toolbar";
import { SalesRowActions } from "@/components/features/sales-row-actions";
import { Table, type Column } from "@/components/ui/table";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// 列表查询返回的销售单类型（含 customer + deliveryOrder.items）
type SalesOrderListItem = Prisma.SalesOrderGetPayload<{
  include: {
    customer: { select: { id: true; name: true; code: true; shortName: true } };
    deliveryOrder: {
      select: {
        id: true;
        orderNo: true;
        status: true;
        items: {
          select: {
            reservedQuantity: true;
            deliveryQuantity: true;
            receivedQuantity: true;
            unitPrice: true;
          };
        };
      };
    };
  };
}>;

// 带序号和聚合金额的行类型
type SalesOrderRow = SalesOrderListItem & {
  index: number;
  orderAmount: number;
  reservedAmount: number;
  deliveryAmount: number;
};

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

// 分页链接组件（Server Component）
function PaginationLink({
  page,
  pageSize,
  total,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string>;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  function buildUrl(targetPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(targetPage));
    return `/sales?${params.toString()}`;
  }

  function getPageNumbers(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-text-muted">
        共 {total} 条，第 {page}/{totalPages} 页
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={buildUrl(page - 1)}
          className={`px-3 py-1.5 rounded-lg text-sm border border-border text-text-muted hover:bg-bg transition ${
            page <= 1 ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          上一页
        </Link>
        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-text-muted">
              ...
            </span>
          ) : (
            <Link
              key={p}
              href={buildUrl(p)}
              className={`min-w-[32px] px-2 py-1.5 rounded-lg text-sm font-medium transition ${
                p === page
                  ? "bg-primary text-white"
                  : "border border-border text-text-muted hover:bg-bg"
              }`}
            >
              {p}
            </Link>
          )
        )}
        <Link
          href={buildUrl(page + 1)}
          className={`px-3 py-1.5 rounded-lg text-sm border border-border text-text-muted hover:bg-bg transition ${
            page >= totalPages ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          下一页
        </Link>
      </div>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  // 构建查询条件（搜索框：销售单编码 salesNo contains）
  const where: Prisma.SalesOrderWhereInput = {};
  if (params.search) {
    where.salesNo = { contains: params.search };
  }

  // Server Component 直接查询数据库
  const [items, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, code: true, shortName: true },
        },
        deliveryOrder: {
          select: {
            id: true,
            orderNo: true,
            status: true,
            items: {
              select: {
                reservedQuantity: true,
                deliveryQuantity: true,
                receivedQuantity: true,
                unitPrice: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  // 聚合金额计算
  const rows: SalesOrderRow[] = items.map((item, i) => {
    const orderAmount = item.deliveryOrder.items.reduce(
      (s, it) => s + it.receivedQuantity * it.unitPrice,
      0
    );
    const reservedAmount = item.deliveryOrder.items.reduce(
      (s, it) => s + it.reservedQuantity * it.unitPrice,
      0
    );
    const deliveryAmount = item.deliveryOrder.items.reduce(
      (s, it) => s + it.deliveryQuantity * it.unitPrice,
      0
    );
    return {
      ...item,
      index: (page - 1) * pageSize + i + 1,
      orderAmount,
      reservedAmount,
      deliveryAmount,
    };
  });

  // 列定义（复用 Column 类型）
  const columns: Column<SalesOrderRow>[] = [
    {
      key: "index",
      title: "序号",
      width: "48px",
      render: (row) => <span className="text-text-muted">{row.index}</span>,
    },
    {
      key: "salesNo",
      title: "销售单编码",
      render: (row) => <span className="font-mono">{row.salesNo}</span>,
    },
    {
      key: "customerName",
      title: "客户名称",
      render: (row) => (
        <span className="font-medium">{row.customer?.name || "-"}</span>
      ),
    },
    {
      key: "customerCode",
      title: "客户编码",
      render: (row) => (
        <span className="text-text-muted">{row.customer?.code || "-"}</span>
      ),
    },
    {
      key: "customerShortName",
      title: "客户简称",
      render: (row) => (
        <span>{row.customer?.shortName || "-"}</span>
      ),
    },
    {
      key: "deliveryOrderNo",
      title: "单据编号",
      render: (row) => (
        <span className="font-mono">{row.deliveryOrder?.orderNo || "-"}</span>
      ),
    },
    {
      key: "orderAmount",
      title: "单据金额",
      render: (row) => (
        <span className="font-medium">{formatCurrency(row.orderAmount)}</span>
      ),
    },
    {
      key: "reservedAmount",
      title: "预定金额",
      render: (row) => (
        <span>{formatCurrency(row.reservedAmount)}</span>
      ),
    },
    {
      key: "deliveryAmount",
      title: "配送金额",
      render: (row) => <span>{formatCurrency(row.deliveryAmount)}</span>,
    },
    {
      key: "status",
      title: "状态",
      render: (row) => <StatusBadge status={row.deliveryOrder?.status || ""} />,
    },
    {
      key: "createdAt",
      title: "添加时间",
      render: (row) => (
        <span className="text-text-muted text-sm">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      render: (row) => (
        <SalesRowActions
          sale={{ id: row.id, salesNo: row.salesNo }}
        />
      ),
    },
  ];

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text">销售单管理</h1>
          <p className="text-sm text-text-muted mt-1">
            共 {total} 条销售单记录
          </p>
        </div>
        <SalesToolbar />
      </div>

      {/* 搜索表单 */}
      <SalesSearchForm />

      {/* 销售单列表表格（复用 Table 组件） */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <Table<SalesOrderRow>
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          emptyText="暂无销售单数据"
        />
      </div>

      {/* 分页 */}
      <PaginationLink
        page={page}
        pageSize={pageSize}
        total={total}
        searchParams={params as Record<string, string>}
      />
    </div>
  );
}
