import { prisma } from "@/lib/prisma";
import SaleListView from "@/components/SaleListView";

const PAGE_SIZE = 15;

export default async function SalePage() {
  const [items, total] = await Promise.all([
    prisma.salesOrder.findMany({
      include: {
        customer: { select: { code: true, name: true, shortName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.salesOrder.count(),
  ]);

  const initialData = {
    items: items.map((o) => ({
      ...o,
      deliveryDate: o.deliveryDate?.toISOString() ?? null,
      receiptDate: o.receiptDate?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
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
            <a href="/" className="text-xl font-bold">🥬 绿粮</a>
            <nav className="flex gap-4 text-sm">
              <a href="/" className="text-muted-foreground hover:text-foreground">商品</a>
              <a href="/custom" className="text-muted-foreground hover:text-foreground">客户</a>
              <a href="/supplier" className="text-muted-foreground hover:text-foreground">供应商</a>
              <a href="/sale" className="text-foreground font-medium">销售单</a>
            </nav>
          </div>
          <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground">管理后台 →</a>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-6">销售单管理</h2>
        <SaleListView initialData={initialData} />
      </main>
    </div>
  );
}
