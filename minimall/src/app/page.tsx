import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductFilters } from "@/components/product/ProductFilters";
import { Pagination } from "@/components/ui/Pagination";

type HomePageProps = {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
};

/**
 * 首页 — 商品网格 + 搜索 + 分类筛选 + 分页
 * Server Component 直接查数据库
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const category = params.category || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  // 使用 Prisma 生成类型编译期校验
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

  if (category) {
    where.category = { slug: category };
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  // 并行查询
  const [products, categories, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" } },
      },
      skip: (page - 1) * DEFAULT_PAGE_SIZE,
      take: DEFAULT_PAGE_SIZE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

  const categoriesData = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    productCount: cat._count.products,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">商品列表</h1>

      <ProductFilters categories={categoriesData} />

      <div className="mt-4 text-sm text-gray-500">
        {search && <span>搜索 &ldquo;{search}&rdquo;：找到 {total} 件商品</span>}
        {category && !search && <span>共 {total} 件商品</span>}
        {!category && !search && <span>共 {total} 件商品</span>}
      </div>

      <div className="mt-4">
        <ProductGrid products={products} />
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/"
        searchParams={
          Object.fromEntries(
            Object.entries({ search, category }).filter(([, v]) => v)
          ) as Record<string, string>
        }
      />
    </div>
  );
}
