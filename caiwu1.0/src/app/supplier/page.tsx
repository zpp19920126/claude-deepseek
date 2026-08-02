import { prisma } from "@/lib/prisma";
import SupplierListView from "@/components/SupplierListView";

const PAGE_SIZE = 15;

export default async function SupplierPage() {
  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: { updatedAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true, code: true, name: true, shortName: true, pinyin: true,
        contactPerson: true, phone: true, mobile: true, email: true, address: true,
        priceMode: true, fax: true, zipCode: true, taxId: true, bank: true,
        region: true, updatedBy: true,
        contractStartDate: true, contractEndDate: true,
        orderStartTime: true, orderStopTime: true,
        createdAt: true, updatedAt: true,
      },
    }),
    prisma.supplier.count(),
  ]);

  const initialData = {
    items: items.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      contractStartDate: s.contractStartDate?.toISOString() ?? null,
      contractEndDate: s.contractEndDate?.toISOString() ?? null,
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
              <a href="/supplier" className="text-foreground font-medium">供应商</a>
              <a href="/sale" className="text-muted-foreground hover:text-foreground">销售单</a>
            </nav>
          </div>
          <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground">管理后台 →</a>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-6">供应商管理</h2>
        <SupplierListView initialData={initialData} />
      </main>
    </div>
  );
}
