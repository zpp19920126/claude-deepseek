import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getCurrentUser } from "@/lib/session";
import { Table, type Column } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { PurchaseRowActions } from "@/components/features/purchase-row-actions";
import { PURCHASE_ORDER_STATUS } from "@/types";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// 进货单列表项类型（含供应商与操作人）
type PurchaseOrderListItem = Prisma.PurchaseOrderGetPayload<{
  include: {
    supplier: { select: { id: true; name: true; shortName: true } };
    user: { select: { id: true; name: true } };
  };
}>;

type PurchaseOrderRow = PurchaseOrderListItem & { index: number };

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
    return `/purchases?${params.toString()}`;
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

// 筛选表单（原生 GET 提交，无需 client 组件）
function FilterForm({
  suppliers,
  params,
}: {
  suppliers: { id: number; name: string }[];
  params: Record<string, string>;
}) {
  return (
    <form
      method="get"
      action="/purchases"
      className="bg-surface rounded-xl border border-border p-4 mb-4 flex flex-wrap items-end gap-3"
    >
      <div>
        <label className="block text-xs text-text-muted mb-1">订单号</label>
        <input
          type="text"
          name="orderNo"
          defaultValue={params.orderNo || ""}
          placeholder="PO-20260803-001"
          className="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">供应商</label>
        <select
          name="supplierId"
          defaultValue={params.supplierId || ""}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">全部供应商</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">状态</label>
        <select
          name="status"
          defaultValue={params.status || ""}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">全部状态</option>
          {Object.entries(PURCHASE_ORDER_STATUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">开始日期</label>
        <input
          type="date"
          name="startDate"
          defaultValue={params.startDate || ""}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">结束日期</label>
        <input
          type="date"
          name="endDate"
          defaultValue={params.endDate || ""}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
        >
          查询
        </button>
        <a
          href="/purchases"
          className="px-4 py-2 rounded-lg border border-border text-text text-sm hover:bg-bg"
        >
          重置
        </a>
      </div>
    </form>
  );
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PurchasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  const where: Prisma.PurchaseOrderWhereInput = {};
  if (params.orderNo) where.orderNo = { contains: params.orderNo };
  if (params.supplierId) where.supplierId = Number(params.supplierId);
  if (params.status) where.status = params.status;
  if (params.startDate) where.createdAt = { gte: new Date(params.startDate) };
  if (params.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...(where.createdAt as object), lte: end };
  }

  const [items, total, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, shortName: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
    prisma.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const rows: PurchaseOrderRow[] = items.map((item, i) => ({
    ...item,
    index: (page - 1) * pageSize + i + 1,
  }));

  const columns: Column<PurchaseOrderRow>[] = [
    {
      key: "index",
      title: "序号",
      width: "48px",
      render: (row) => <span className="text-text-muted">{row.index}</span>,
    },
    {
      key: "orderNo",
      title: "订单号",
      render: (row) => <span className="font-mono text-sm">{row.orderNo}</span>,
    },
    {
      key: "supplier",
      title: "供应商",
      render: (row) => (
        <span className="font-medium">
          {row.supplier.shortName || row.supplier.name}
        </span>
      ),
    },
    {
      key: "totalAmount",
      title: "金额",
      render: (row) => (
        <span className="font-medium">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: "status",
      title: "状态",
      render: (row) => (
        <StatusBadge
          status={row.status}
          label={PURCHASE_ORDER_STATUS[row.status as keyof typeof PURCHASE_ORDER_STATUS] || row.status}
        />
      ),
    },
    {
      key: "user",
      title: "操作人",
      render: (row) => (
        <span className="text-text-muted">{row.user.name}</span>
      ),
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (row) => (
        <span className="text-text-muted text-sm">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "150px",
      render: (row) => (
        <PurchaseRowActions order={row} canDelete={user?.role === "admin"} />
      ),
    },
  ];

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text">进货管理</h1>
          <p className="text-sm text-text-muted mt-1">共 {total} 条进货单</p>
        </div>
        <Link
          href="/purchases/new"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
        >
          + 新建进货单
        </Link>
      </div>

      {/* 筛选表单 */}
      <FilterForm
        suppliers={suppliers}
        params={params as Record<string, string>}
      />

      {/* 进货单列表 */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <Table<PurchaseOrderRow>
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          emptyText="暂无进货单数据"
        />
      </div>

      <PaginationLink
        page={page}
        pageSize={pageSize}
        total={total}
        searchParams={params as Record<string, string>}
      />
    </div>
  );
}
