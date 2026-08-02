import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { SupplierSearchForm } from "@/components/features/supplier-search-form";
import { SupplierToolbar } from "@/components/features/supplier-toolbar";
import { SupplierRowActions } from "@/components/features/supplier-row-actions";
import { Table, type Column } from "@/components/ui/table";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// 列表查询返回的供应商类型
type SupplierListItem = Prisma.SupplierGetPayload<Record<string, never>>;

// 带序号和统计的行类型
type SupplierRow = SupplierListItem & {
  index: number;
  purchaseCount: number;
  productCount: number;
};

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
    return `/suppliers?${params.toString()}`;
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

export default async function SuppliersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  // 构建查询条件（搜索框：供应商编码、供应商名称、简称）
  const where: Prisma.SupplierWhereInput = {};
  if (params.search) {
    where.OR = [
      { code: { contains: params.search } },
      { name: { contains: params.search } },
      { shortName: { contains: params.search } },
    ];
  }

  // Server Component 直接查询数据库
  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);

  const supplierIds = items.map((s) => s.id);

  // 统计每个供应商的进货单数和商品数（避免 N+1）
  const [purchaseCounts, productCounts] = await Promise.all([
    prisma.purchaseOrder.groupBy({
      by: ["supplierId"],
      _count: { _all: true },
      where: { supplierId: { in: supplierIds } },
    }),
    prisma.product.groupBy({
      by: ["supplierId"],
      _count: { _all: true },
      where: { supplierId: { in: supplierIds } },
    }),
  ]);
  const purchaseCountMap = new Map(
    purchaseCounts.map((c) => [c.supplierId, c._count._all] as const)
  );
  const productCountMap = new Map(
    productCounts.map((c) => [c.supplierId, c._count._all] as const)
  );

  // 复用 Table 组件：为每行附加序号和统计
  const rows: SupplierRow[] = items.map((item, i) => ({
    ...item,
    index: (page - 1) * pageSize + i + 1,
    purchaseCount: purchaseCountMap.get(item.id) || 0,
    productCount: productCountMap.get(item.id) || 0,
  }));

  // 列定义（复用 Column 类型）
  const columns: Column<SupplierRow>[] = [
    {
      key: "index",
      title: "序号",
      width: "48px",
      render: (row) => <span className="text-text-muted">{row.index}</span>,
    },
    {
      key: "code",
      title: "供应商编码",
      render: (row) => <span className="font-mono">{row.code}</span>,
    },
    {
      key: "name",
      title: "供应商名称",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "shortName",
      title: "供应商简称",
      render: (row) => (
        <span className="text-text-muted">{row.shortName || "-"}</span>
      ),
    },
    {
      key: "contact",
      title: "联系人",
      render: (row) => (
        <span className="text-text-muted">{row.contact || "-"}</span>
      ),
    },
    {
      key: "phone",
      title: "电话",
      render: (row) => (
        <span className="font-mono text-sm">{row.phone || "-"}</span>
      ),
    },
    {
      key: "address",
      title: "地址",
      render: (row) => (
        <span className="text-text-muted text-sm">
          {row.address || "-"}
        </span>
      ),
    },
    {
      key: "productCount",
      title: "商品数",
      render: (row) => (
        <span className={row.productCount > 0 ? "" : "text-text-muted"}>
          {row.productCount}
        </span>
      ),
    },
    {
      key: "purchaseCount",
      title: "进货单数",
      render: (row) => (
        <span className={row.purchaseCount > 0 ? "" : "text-text-muted"}>
          {row.purchaseCount}
        </span>
      ),
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
      render: (row) => <SupplierRowActions supplier={row} />,
    },
  ];

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text">供应商管理</h1>
          <p className="text-sm text-text-muted mt-1">
            共 {total} 条供应商记录
          </p>
        </div>
        <SupplierToolbar />
      </div>

      {/* 搜索表单 */}
      <SupplierSearchForm />

      {/* 供应商列表表格（复用 Table 组件） */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <Table<SupplierRow>
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          emptyText="暂无供应商数据"
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
