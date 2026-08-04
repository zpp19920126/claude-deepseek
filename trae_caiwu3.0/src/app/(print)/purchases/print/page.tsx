import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PURCHASE_ORDER_STATUS } from "@/types";
import { PrintTrigger } from "@/components/features/print-trigger";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PurchasesPrintPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const where: Record<string, unknown> = {};
  if (params.search) {
    const s = params.search;
    where.OR = [
      { orderNo: { contains: s } },
      { supplier: { OR: [{ name: { contains: s } }, { code: { contains: s } }] } },
      { items: { some: { product: { OR: [{ name: { contains: s } }, { sku: { contains: s } }] } } } },
    ];
  }

  const orders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      supplier: { select: { name: true, code: true } },
      items: {
        include: {
          product: { select: { sku: true, name: true } },
          reservedUnit: { select: { name: true } },
          receivedUnit: { select: { name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const printDate = formatDate(new Date());

  const statusLabel = (status: string) =>
    (PURCHASE_ORDER_STATUS as Record<string, string>)[status] || status;

  return (
    <div className="print-page">
      <PrintTrigger />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .no-print { display: none !important; }
          .order-block { page-break-inside: avoid; }
          @page { size: landscape; }
        }
        .print-page { padding: 20px; font-family: sans-serif; }
        .print-header { text-align: center; margin-bottom: 20px; }
        .print-header h1 { font-size: 20px; margin: 0; }
        .print-header p { font-size: 12px; color: #666; margin: 4px 0; }
        .order-block { border: 1px solid #ddd; margin-bottom: 16px; padding: 12px; }
        .order-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; font-size: 12px; }
        .order-meta div { border-bottom: 1px solid #eee; padding: 2px 0; }
        .amount-summary { display: flex; gap: 20px; margin-bottom: 12px; font-size: 13px; }
        .amount-summary div { font-weight: bold; }
        .print-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .print-table th, .print-table td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
        .print-table th { background: #f5f5f5; }
        .print-table td.num { text-align: right; }
        .print-footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
      `,
        }}
      />

      <div className="print-header">
        <h1>进货单列表</h1>
        <p>打印日期：{printDate}</p>
        <p>共 {orders.length} 条记录</p>
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-gray-500 py-8">暂无进货单数据</p>
      ) : (
        orders.map((order) => {
          const reservedAmount = order.items.reduce(
            (s, it) => s + it.reservedQuantity * it.unitPrice,
            0
          );
          const receivedAmount = order.items.reduce(
            (s, it) => s + it.receivedQuantity * it.unitPrice,
            0
          );
          return (
            <div key={order.id} className="order-block">
              <div className="order-meta">
                <div><strong>进货单编号：</strong>{order.orderNo}</div>
                <div><strong>供应商编码：</strong>{order.supplier?.code || "-"}</div>
                <div><strong>供应商名称：</strong>{order.supplier?.name || "-"}</div>
                <div><strong>状态：</strong>{statusLabel(order.status)}</div>
                <div><strong>创建时间：</strong>{formatDateTime(order.createdAt)}</div>
                <div><strong>更新时间：</strong>{formatDateTime(order.updatedAt)}</div>
                <div><strong>备注：</strong>{order.remark || "-"}</div>
              </div>
              <div className="amount-summary">
                <div>预定金额：{formatCurrency(reservedAmount)}</div>
                <div>实收金额：{formatCurrency(receivedAmount)}</div>
              </div>
              {order.items.length > 0 && (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>商品编码</th>
                      <th>商品名称</th>
                      <th>预定单位</th>
                      <th className="num">预定数量</th>
                      <th>实收单位</th>
                      <th className="num">实收数量</th>
                      <th className="num">单价</th>
                      <th className="num">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, index) => (
                      <tr key={it.id}>
                        <td>{index + 1}</td>
                        <td>{it.product?.sku || "-"}</td>
                        <td>{it.product?.name || "-"}</td>
                        <td>{it.reservedUnit?.name || "-"}</td>
                        <td className="num">{it.reservedQuantity}</td>
                        <td>{it.receivedUnit?.name || "-"}</td>
                        <td className="num">{it.receivedQuantity}</td>
                        <td className="num">{formatCurrency(it.unitPrice)}</td>
                        <td className="num">
                          {formatCurrency(it.receivedQuantity * it.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })
      )}

      <div className="print-footer">
        lvliang 蔬菜配送管理系统 · 打印时间：{formatDateTime(new Date())}
      </div>
    </div>
  );
}
