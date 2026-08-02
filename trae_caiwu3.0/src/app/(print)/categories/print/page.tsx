import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PrintTrigger } from "@/components/features/print-trigger";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CategoriesPrintPage({ searchParams }: PageProps) {
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

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  // 统计每个分类下的商品数量
  const counts = await prisma.product.groupBy({
    by: ["categoryId"],
    _count: { _all: true },
    where: { categoryId: { in: categories.map((c) => c.id) } },
  });
  const countMap = new Map(
    counts.map((c) => [c.categoryId, c._count._all] as const)
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
          <h1>商品分类列表</h1>
          <p>
            打印日期：{printDate} ｜ 共 {categories.length} 条记录
          </p>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>序号</th>
              <th>分类编码</th>
              <th>分类名称</th>
              <th>分类简称</th>
              <th>商品数量</th>
              <th>排序</th>
              <th>添加时间</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, index) => (
              <tr key={c.id}>
                <td>{index + 1}</td>
                <td>{c.code}</td>
                <td>{c.name}</td>
                <td>{c.shortName || "-"}</td>
                <td>{countMap.get(c.id) || 0}</td>
                <td>{c.sortOrder}</td>
                <td>{formatDateTime(c.createdAt)}</td>
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
