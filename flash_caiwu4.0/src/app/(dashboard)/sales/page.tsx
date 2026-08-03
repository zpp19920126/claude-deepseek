import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getCurrentUser } from "@/lib/session";
import { Table, type Column } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { SalesRowActions } from "@/components/features/sales-row-actions";
import { SALES_ORDER_STATUS } from "@/types";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// 销售单列表项类型（含客户与操作人）
type SalesOrderListItem = Prisma.SalesOrderGetPayload<{
  include: {
    customer: { select: { id: true; name: true; shortName: true } };
    user: { select: { id: true; name: true } };
  };
}>;

type SalesOrderRow = SalesOrderListItem & { index: number };

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

// 筛选表单（原生 GET 提交，无需 client 组件）
function FilterForm({
  customers,
  params,
}: {
  customers: { id: number; name: string }[];
  params: Record<string, string>;
}) {
  return (
    <form
      method="get"
      action="/sales"
      className="bg-surface rounded-xl border border-border p-4 mb-4 flex flex-wrap items-end gap-3"
    >
      <div>
        <label className="block text-xs text-text-muted mb-1">订单号</label>
        <input
          type="text"
          name="orderNo"
          defaultValue={params.orderNo || ""}
          placeholder="SO-20260803-001"
          className="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">客户</label>
        <select
          name="customerId"
          defaultValue={params.customerId || ""}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">全部客户</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
          {Object.entries(SALES_ORDER_STATUS).map(([value, label]) => (
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
          href="/sales"
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

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  const where: Prisma.SalesOrderWhereInput = {};
  if (params.orderNo) where.orderNo = { contains: params.orderNo };
  if (params.customerId) where.customerId = Number(params.customerId);
  if (params.status) where.status = params.status;
  if (params.startDate) where.createdAt = { gte: new Date(params.startDate) };
  if (params.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...(where.createdAt as object), lte: end };
  }

  const [items, total, customers] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, shortName: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesOrder.count({ where }),
    prisma.customer.findMany({
      select: { id: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const rows: SalesOrderRow[] = items.map((item, i) => ({
    ...item,
    index: (page - 1) * pageSize + i + 1,
  }));

  const columns: Column<SalesOrderRow>[] = [
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
      key: "customer",
      title: "客户",
      render: (row) => (
        <span className="font-medium">
          {row.customer.shortName || row.customer.name}
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
          label={SALES_ORDER_STATUS[row.status as keyof typeof SALES_ORDER_STATUS] || row.status}
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
        <SalesRowActions order={row} canDelete={user?.role === "admin"} />
      ),
    },
  ];

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text">销售单管理</h1>
          <p className="text-sm text-text-muted mt-1">共 {total} 条销售单</p>
        </div>
        <Link
          href="/sales/new"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
        >
          + 新建销售单
        </Link>
      </div>

      {/* 筛选表单 */}
      <FilterForm
        customers={customers}
        params={params as Record<string, string>}
      />

      {/* 销售单列表 */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <Table<SalesOrderRow>
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          emptyText="暂无销售单数据"
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
