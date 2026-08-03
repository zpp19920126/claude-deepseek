import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";
import { PrintTrigger } from "@/components/features/print-trigger";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DeliveryOrdersPrintPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  // 构建与列表页相同的查询条件（但不分页，获取全量数据）
  const where: Record<string, unknown> = {};
  if (params.search) {
    where.orderNo = { contains: params.search };
  }

  const orders = await prisma.deliveryOrder.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, code: true } },
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true } },
          reservedUnit: { select: { id: true, name: true } },
          deliveryUnit: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const printDate = formatDate(new Date());

  const statusLabel = (status: string) =>
    (DELIVERY_ORDER_STATUS as Record<string, string>)[status] || status;

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
          .order-block { page-break-inside: avoid; }
          @page { margin: 1.5cm; size: landscape; }
        }
        .print-container { padding: 20px; font-family: -apple-system, "Microsoft YaHei", sans-serif; }
        .print-header { text-align: center; margin-bottom: 20px; }
        .print-header h1 { font-size: 22px; margin: 0 0 8px 0; }
        .print-header p { font-size: 12px; color: #666; margin: 0; }
        .order-block { margin-bottom: 28px; }
        .order-meta { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-bottom: 8px; font-size: 12px; color: #333; }
        .order-meta strong { color: #000; }
        .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .print-table th { background: #f0f0f0; padding: 6px 8px; text-align: left; border: 1px solid #ddd; white-space: nowrap; }
        .print-table td { padding: 4px 8px; border: 1px solid #ddd; }
        .print-table tr:nth-child(even) { background: #fafafa; }
        .print-table tfoot td { font-weight: bold; background: #f7f7f7; }
        .print-footer { margin-top: 20px; text-align: right; font-size: 11px; color: #999; }
      `,
        }}
      />

      <div className="print-container">
        <div className="print-header">
          <h1>销售配送单列表</h1>
          <p>
            打印日期：{printDate} ｜ 共 {orders.length} 张配送单
          </p>
        </div>

        {orders.length === 0 ? (
          <p className="text-center text-sm" style={{ color: "#999" }}>
            暂无配送单数据
          </p>
        ) : (
          orders.map((order) => {
            const totalDeliveryQty = order.items.reduce(
              (s, it) => s + it.deliveryQuantity,
              0
            );
            const totalReceivedQty = order.items.reduce(
              (s, it) => s + it.receivedQuantity,
              0
            );
            const totalAmount = order.items.reduce(
              (s, it) => s + it.deliveryQuantity * it.unitPrice,
              0
            );
            return (
              <div key={order.id} className="order-block">
                <div className="order-meta">
                  <span>
                    <strong>单据编号：</strong>
                    {order.orderNo}
                  </span>
                  <span>
                    <strong>客户：</strong>
                    {order.customer?.code} {order.customer?.name}
                  </span>
                  <span>
                    <strong>状态：</strong>
                    {statusLabel(order.status)}
                  </span>
                  <span>
                    <strong>创建时间：</strong>
                    {formatDateTime(order.createdAt)}
                  </span>
                  {order.remark && (
                    <span>
                      <strong>备注：</strong>
                      {order.remark}
                    </span>
                  )}
                </div>

                <table className="print-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>序号</th>
                      <th>商品编码</th>
                      <th>商品名称</th>
                      <th>预定单位</th>
                      <th>预定数量</th>
                      <th>配送单位</th>
                      <th>配送数量</th>
                      <th>实收数量</th>
                      <th>单价</th>
                      <th>小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, index) => (
                      <tr key={it.id}>
                        <td>{index + 1}</td>
                        <td>{it.product?.sku || "-"}</td>
                        <td>{it.product?.name || "-"}</td>
                        <td>{it.reservedUnit?.name || "-"}</td>
                        <td>{it.reservedQuantity}</td>
                        <td>{it.deliveryUnit?.name || "-"}</td>
                        <td>{it.deliveryQuantity}</td>
                        <td>{it.receivedQuantity}</td>
                        <td>{formatCurrency(it.unitPrice)}</td>
                        <td>{formatCurrency(it.deliveryQuantity * it.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>合计</td>
                      <td>-</td>
                      <td>配送：{totalDeliveryQty}</td>
                      <td>实收：{totalReceivedQty}</td>
                      <td>-</td>
                      <td colSpan={2}>{formatCurrency(totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })
        )}

        <div className="print-footer">
          lvliang 蔬菜配送管理系统 ｜ {printDate}
        </div>
      </div>
    </div>
  );
}
