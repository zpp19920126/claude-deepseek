import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintTrigger } from "@/components/features/print-trigger";
import { PURCHASE_ORDER_STATUS } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchasePrintPage({ params }: PageProps) {
  const { id } = await params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: Number(id) },
    include: {
      supplier: {
        select: { name: true, shortName: true, phone: true, address: true },
      },
      user: { select: { name: true } },
      items: {
        include: {
          product: {
            select: { sku: true, name: true, unit: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const statusLabel =
    PURCHASE_ORDER_STATUS[order.status as keyof typeof PURCHASE_ORDER_STATUS] ||
    order.status;
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
          @page { size: A4; margin: 12mm; }
        }
        .print-container { padding: 20px; font-family: -apple-system, "Microsoft YaHei", sans-serif; }
        .print-header { text-align: center; margin-bottom: 20px; }
        .print-header h1 { font-size: 24px; margin: 0 0 4px 0; }
        .print-header p { font-size: 12px; color: #666; margin: 0; }
        .print-meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 12px; }
        .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .print-table th { background: #f0f0f0; padding: 6px 8px; text-align: left; border: 1px solid #ddd; white-space: nowrap; }
        .print-table td { padding: 5px 8px; border: 1px solid #ddd; }
        .print-summary { text-align: right; margin-top: 12px; font-size: 13px; }
        .print-sign { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; }
        .print-footer { margin-top: 20px; text-align: right; font-size: 11px; color: #999; }
      `,
        }}
      />

      <div className="print-container">
        <div className="print-header">
          <h1>进 货 单</h1>
          <p>lvliang 蔬菜配送管理系统</p>
        </div>

        <div className="print-meta">
          <div>
            <p>订单号：<strong>{order.orderNo}</strong></p>
            <p>状态：{statusLabel}</p>
            <p>开单日期：{formatDate(order.createdAt)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p>供货单位：<strong>{order.supplier.shortName || order.supplier.name}</strong></p>
            {order.supplier.phone && <p>电话：{order.supplier.phone}</p>}
            {order.supplier.address && <p>地址：{order.supplier.address}</p>}
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>序号</th>
              <th>商品编码</th>
              <th>商品名称</th>
              <th>单位</th>
              <th style={{ width: 80 }}>数量</th>
              <th style={{ width: 90 }}>进货单价</th>
              <th style={{ width: 100 }}>金额</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.product.sku}</td>
                <td>{item.product.name}</td>
                <td>{item.product.unit.name}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.cost)}</td>
                <td>{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-summary">
          合计金额：<strong>{formatCurrency(order.totalAmount)}</strong>
        </div>

        {order.remark && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            备注：{order.remark}
          </div>
        )}

        <div className="print-sign">
          <span>制单人：{order.user.name}</span>
          <span>收货人签字：____________</span>
          <span>日期：____________</span>
        </div>

        <div className="print-footer">
          打印日期：{printDate} ｜ lvliang 蔬菜配送管理系统
        </div>
      </div>
    </div>
  );
}
