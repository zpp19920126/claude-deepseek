import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintTrigger } from "@/components/features/print-trigger";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ProductsPrintPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 构建与列表页相同的查询条件（但不分页，获取全量数据）
  const where: Record<string, unknown> = {};
  if (params.sku) where.sku = { contains: params.sku };
  if (params.name) where.name = { contains: params.name };
  if (params.shortName) where.shortName = { contains: params.shortName };
  if (params.categoryId) where.categoryId = Number(params.categoryId);
  if (params.supplierId) where.supplierId = Number(params.supplierId);

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { name: true } },
      unit: { select: { name: true } },
      supplier: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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
          <h1>商品列表</h1>
          <p>
            打印日期：{printDate} ｜ 共 {products.length} 条记录
          </p>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>序号</th>
              <th>商品编码</th>
              <th>商品名称</th>
              <th>商品简称</th>
              <th>商品分类</th>
              <th>基本单位</th>
              <th>默认供应商</th>
              <th>销售价</th>
              <th>进货价</th>
              <th>库存</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, index) => (
              <tr key={p.id}>
                <td>{index + 1}</td>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.shortName || "-"}</td>
                <td>{p.category.name}</td>
                <td>{p.unit.name}</td>
                <td>{p.supplier?.name || "-"}</td>
                <td>{formatCurrency(p.price)}</td>
                <td>{formatCurrency(p.cost)}</td>
                <td>{p.stock}</td>
                <td>{p.status === "active" ? "在售" : "停售"}</td>
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
