import { prisma } from "@/lib/prisma";
import ProductListView from "@/components/ProductListView";

const PAGE_SIZE = 15;

export default async function Home() {
  const [categories, units, productsData] = await Promise.all([
    prisma.category.findMany({
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.unit.findMany({
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.product.findMany({
      include: {
        unit: { select: { code: true, name: true } },
        category: { select: { code: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: PAGE_SIZE,
    }),
  ]);

  const total = await prisma.product.count();

  const initialData = {
    items: productsData.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    total,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">🥬 绿粮</h1>
            <nav className="flex gap-4 text-sm">
              <span className="text-foreground font-medium">商品</span>
              <a href="/custom" className="text-muted-foreground hover:text-foreground">客户</a>
              <a href="/supplier" className="text-muted-foreground hover:text-foreground">供应商</a>
              <a href="/sale" className="text-muted-foreground hover:text-foreground">销售单</a>
            </nav>
          </div>
          <a
            href="/admin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            管理后台 →
          </a>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-6">商品管理</h2>
        <ProductListView
          categories={categories}
          units={units}
          initialData={initialData}
        />
      </main>
    </div>
  );
}
