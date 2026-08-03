import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { ProductSearchForm } from "@/components/features/product-search-form";
import { ProductToolbar } from "@/components/features/product-toolbar";
import { ProductRowActions } from "@/components/features/product-row-actions";
import { Table, type Column } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// 列表查询返回的商品类型（含关联实体）
type ProductListItem = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true } };
    unit: { select: { id: true; name: true } };
    supplier: { select: { id: true; name: true } };
  };
}>;

// 带序号的行类型
type ProductRow = ProductListItem & { index: number };

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
    return `/products?${params.toString()}`;
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

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  // 构建查询条件
  const where: Prisma.ProductWhereInput = {};
  if (params.sku) where.sku = { contains: params.sku };
  if (params.name) where.name = { contains: params.name };
  if (params.shortName) where.shortName = { contains: params.shortName };
  if (params.categoryId) where.categoryId = Number(params.categoryId);
  if (params.supplierId) where.supplierId = Number(params.supplierId);

  // Server Component 直接查询数据库
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  // 复用 Table 组件：为每行附加序号
  const rows: ProductRow[] = items.map((item, i) => ({
    ...item,
    index: (page - 1) * pageSize + i + 1,
  }));

  // 列定义（复用 Column 类型）
  const columns: Column<ProductRow>[] = [
    {
      key: "index",
      title: "序号",
      width: "48px",
      render: (row) => (
        <span className="text-text-muted">{row.index}</span>
      ),
    },
    {
      key: "sku",
      title: "商品编码",
      render: (row) => <span className="font-mono">{row.sku}</span>,
    },
    {
      key: "name",
      title: "商品名称",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "shortName",
      title: "商品简称",
      render: (row) => (
        <span className="text-text-muted">{row.shortName || "-"}</span>
      ),
    },
    {
      key: "category",
      title: "商品分类",
      render: (row) => row.category.name,
    },
    {
      key: "unit",
      title: "基本单位",
      render: (row) => row.unit.name,
    },
    {
      key: "supplier",
      title: "默认供应商",
      render: (row) => (
        <span className="text-text-muted">{row.supplier?.name || "-"}</span>
      ),
    },
    {
      key: "price",
      title: "销售价",
      render: (row) => formatCurrency(row.price),
    },
    {
      key: "stock",
      title: "库存",
      render: (row) => (
        <span
          className={
            row.stock <= row.minStock ? "text-danger font-medium" : ""
          }
        >
          {row.stock}
        </span>
      ),
    },
    {
      key: "status",
      title: "状态",
      render: (row) => (
        <Badge variant={row.status === "active" ? "success" : "default"}>
          {row.status === "active" ? "在售" : "停售"}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      render: (row) => <ProductRowActions product={row} />,
    },
  ];

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text">商品管理</h1>
          <p className="text-sm text-text-muted mt-1">共 {total} 条商品记录</p>
        </div>
        <ProductToolbar />
      </div>

      {/* 搜索表单 */}
      <ProductSearchForm />

      {/* 商品列表表格（复用 Table 组件） */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <Table<ProductRow>
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          emptyText="暂无商品数据"
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
