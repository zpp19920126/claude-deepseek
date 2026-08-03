import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PrintTrigger } from "@/components/features/print-trigger";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SuppliersPrintPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 构建与列表页相同的查询条件（但不分页，获取全量数据）
  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { code: { contains: params.search } },
      { name: { contains: params.search } },
      { shortName: { contains: params.search } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  const supplierIds = suppliers.map((s) => s.id);
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

  const printDate = formatDate(new Date());

  return (
    <div className="print-page">
      <PrintTrigger />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .print-page { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; size: landscape; }
        }
        .print-container { padding: 20px; font-family: -apple-system, "Microsoft YaHei", sans-serif; }
        .print-header { text-align: center; margin-bottom: 20px; }
        .print-header h1 { font-size: 22px; margin: 0 0 8px 0; }
        .print-header p { font-size: 12px; color: #666; margin: 0; }
        .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .print-table th { background: #f0f0f0; padding: 6px 8px; text-align: left; border: 1px solid #ddd; white-space: nowrap; }
        .print-table td { padding: 4px 8px; border: 1px solid #ddd; }
        .print-table tr:nth-child(even) { background: #fafafa; }
        .print-footer { margin-top: 20px; text-align: right; font-size: 11px; color: #999; }
      `,
        }}
      />

      <div className="print-container">
        <div className="print-header">
          <h1>供应商列表</h1>
          <p>
            打印日期：{printDate} ｜ 共 {suppliers.length} 条记录
          </p>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>序号</th>
              <th>供应商编码</th>
              <th>供应商名称</th>
              <th>供应商简称</th>
              <th>联系人</th>
              <th>电话</th>
              <th>地址</th>
              <th>商品数</th>
              <th>进货单数</th>
              <th>添加时间</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s, index) => (
              <tr key={s.id}>
                <td>{index + 1}</td>
                <td>{s.code}</td>
                <td>{s.name}</td>
                <td>{s.shortName || "-"}</td>
                <td>{s.contact || "-"}</td>
                <td>{s.phone || "-"}</td>
                <td>{s.address || "-"}</td>
                <td>{productCountMap.get(s.id) || 0}</td>
                <td>{purchaseCountMap.get(s.id) || 0}</td>
                <td>{formatDateTime(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-footer">
          lvliang 蔬菜配送管理系统 ｜ {printDate}
        </div>
      </div>
    </div>
  );
}
